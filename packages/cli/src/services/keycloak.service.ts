import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { GLOBAL_MEMBER_ROLE, isValidEmail, type User, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import axios from 'axios';
import { Cipher } from 'n8n-core';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';

/**
 * Keycloak authentication service for Community Edition
 * Handles token validation and user management without enterprise OIDC features
 */
@Service()
export class KeycloakService {
	private keycloakConfig: {
		enabled: boolean;
		uri: string;
		realm: string;
		clientId: string;
	};

	constructor(
		private readonly userRepository: UserRepository,
		private readonly globalConfig: GlobalConfig,
		private readonly cipher: Cipher,
		private readonly logger: Logger,
	) {
		// Load Keycloak configuration from environment variables
		this.keycloakConfig = {
			enabled: process.env.N8N_KEYCLOAK_ENABLED === 'true',
			uri: process.env.N8N_KEYCLOAK_URI || 'http://localhost:8080',
			realm: process.env.N8N_KEYCLOAK_REALM || 'n8n-realm',
			clientId: process.env.N8N_KEYCLOAK_CLIENT_ID || 'n8n-client',
		};

		if (this.keycloakConfig.enabled) {
			this.logger.info('Keycloak authentication is enabled');
		}
	}

	/**
	 * Check if Keycloak authentication is enabled
	 */
	isEnabled(): boolean {
		return this.keycloakConfig.enabled;
	}

	/**
	 * Validate a Keycloak token by calling the userinfo endpoint
	 */
	async validateToken(accessToken: string): Promise<{
		sub: string;
		email: string;
		given_name?: string;
		family_name?: string;
		name?: string;
		preferred_username?: string;
	}> {
		try {
			const userinfoUrl = `${this.keycloakConfig.uri}/realms/${this.keycloakConfig.realm}/protocol/openid-connect/userinfo`;

			const response = await axios.get(userinfoUrl, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
				timeout: 10000,
			});

			return response.data;
		} catch (error) {
			this.logger.error('Failed to validate Keycloak token', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw new BadRequestError('Invalid or expired token');
		}
	}

	/**
	 * Validate token expiration
	 */
	isTokenExpired(tokenParsed: any): boolean {
		if (!tokenParsed.exp) {
			return false; // No expiration claim, assume valid
		}
		return Date.now() >= tokenParsed.exp * 1000;
	}

	/**
	 * Login or create user based on Keycloak token
	 */
	async loginWithKeycloakToken(
		accessToken: string,
		tokenParsed: any,
	): Promise<User> {
		// Check token expiration
		if (this.isTokenExpired(tokenParsed)) {
			throw new BadRequestError('Token has expired');
		}

		// Validate token with Keycloak
		const userInfo = await this.validateToken(accessToken);

		if (!userInfo.email) {
			throw new BadRequestError('Email is required in Keycloak token');
		}

		if (!isValidEmail(userInfo.email)) {
			throw new BadRequestError('Invalid email format');
		}

		// Check if user exists
		let user = await this.userRepository.findOne({
			where: { email: userInfo.email },
			relations: ['role'],
		});

		if (user) {
			this.logger.debug(`Keycloak login: User ${userInfo.email} already exists`);
			return user;
		}

		// Create new user with just-in-time provisioning
		this.logger.info(`Creating new user from Keycloak: ${userInfo.email}`);

		return await this.userRepository.manager.transaction(async (trx) => {
			const { user: newUser } = await this.userRepository.createUserWithProject(
				{
					email: userInfo.email,
					firstName: userInfo.given_name || userInfo.name?.split(' ')[0] || 'User',
					lastName:
						userInfo.family_name ||
						userInfo.name?.split(' ').slice(1).join(' ') ||
						'',
					role: GLOBAL_MEMBER_ROLE,
					password: this.generateSecurePassword(),
					authIdentities: [],
				},
				trx,
			);

			return newUser;
		});
	}

	/**
	 * Generate a secure random password for Keycloak users
	 * These users won't use password auth, so it's just a placeholder
	 */
	private generateSecurePassword(): string {
		const chars =
			'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
		let password = '';
		for (let i = 0; i < 32; i++) {
			password += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return password;
	}

	/**
	 * Get Keycloak configuration for frontend
	 */
	getConfig() {
		return {
			enabled: this.keycloakConfig.enabled,
			uri: this.keycloakConfig.uri,
			realm: this.keycloakConfig.realm,
			clientId: this.keycloakConfig.clientId,
		};
	}
}
