import { Logger } from '@n8n/backend-common';
import { Body, Post, RestController } from '@n8n/decorators';
import { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { AuthlessRequest } from '@/requests';
import { KeycloakService } from '@/services/keycloak.service';

/**
 * Controller for Keycloak authentication (Community Edition compatible)
 * Handles token validation and user login without enterprise features
 */
@RestController('/keycloak-auth')
export class KeycloakAuthController {
	constructor(
		private readonly keycloakService: KeycloakService,
		private readonly authService: AuthService,
		private readonly logger: Logger,
	) {}

	/**
	 * Handle token validation from dash-button component
	 * POST /rest/keycloak-auth/login
	 *
	 * This endpoint validates a Keycloak JWT token and creates an n8n session
	 */
	@Post('/login', { skipAuth: true })
	async loginWithKeycloakToken(
		req: AuthlessRequest,
		res: Response,
		@Body payload: { token: string; tokenParsed: any; idTokenParsed: any },
	) {
		try {
			// Check if Keycloak is enabled
			if (!this.keycloakService.isEnabled()) {
				throw new BadRequestError('Keycloak authentication is not enabled');
			}

			const { token, tokenParsed, idTokenParsed } = payload;

			if (!token || !tokenParsed) {
				this.logger.error('Token or tokenParsed is missing');
				throw new BadRequestError('Invalid token data');
			}

			// Use idTokenParsed if available, otherwise use tokenParsed
			const claims = idTokenParsed || tokenParsed;

			// Validate token and login/create user
			const user = await this.keycloakService.loginWithKeycloakToken(token, claims);

			// Issue n8n authentication cookie
			this.authService.issueCookie(res, user, true, req.browserId);

			this.logger.info(`User ${user.email} logged in via Keycloak`);

			return {
				success: true,
				user: {
					id: user.id,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
				},
			};
		} catch (error) {
			this.logger.error('Keycloak token validation error:', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});

			if (error instanceof BadRequestError) {
				throw error;
			}

			throw new BadRequestError('Token validation failed');
		}
	}

	/**
	 * Get Keycloak configuration
	 * GET /rest/keycloak-auth/config
	 */
	@Post('/config', { skipAuth: true })
	async getConfig() {
		return this.keycloakService.getConfig();
	}
}
