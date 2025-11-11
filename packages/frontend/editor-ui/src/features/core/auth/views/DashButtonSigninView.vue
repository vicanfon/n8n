<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nLogo } from '@n8n/design-system';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';
import { VIEWS } from '@/app/constants';

// Import the dash-button web component
import 'dash-button-web';

// Declare custom element for TypeScript
declare global {
	namespace JSX {
		interface IntrinsicElements {
			'dash-button': {
				'keycloak-uri'?: string;
				realm?: string;
				'client-id'?: string;
				'portal-api-url'?: string;
				'login-method'?: 'check-sso' | 'login-required';
				'show-user-info'?: boolean;
			};
		}
	}
}

const usersStore = useUsersStore();
const settingsStore = useSettingsStore();
const ssoStore = useSSOStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const locale = useI18n();
const telemetry = useTelemetry();

const loading = ref(false);
const dashButtonRef = ref<HTMLElement | null>(null);

// Keycloak configuration
// These should be loaded from environment variables or settings
const keycloakConfig = computed(() => ({
	uri: import.meta.env.VITE_KEYCLOAK_URI || 'http://localhost:8080',
	realm: import.meta.env.VITE_KEYCLOAK_REALM || 'n8n-realm',
	clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'n8n-client',
}));

const isRedirectSafe = () => {
	const redirect = getRedirectQueryParameter();

	// Allow local redirects
	if (redirect.startsWith('/')) {
		return true;
	}

	try {
		// Only allow origin domain redirects
		const url = new URL(redirect);
		return url.origin === window.location.origin;
	} catch {
		return false;
	}
};

const getRedirectQueryParameter = () => {
	let redirect = '';
	if (typeof route.query?.redirect === 'string') {
		redirect = decodeURIComponent(route.query?.redirect);
	}
	return redirect;
};

const handleAuthSuccess = async (event: CustomEvent) => {
	try {
		loading.value = true;
		const { token, tokenParsed, idTokenParsed } = event.detail;

		// Log authentication details for debugging
		console.log('Keycloak authentication successful', {
			email: tokenParsed?.email,
			name: tokenParsed?.name,
			preferred_username: tokenParsed?.preferred_username,
		});

		// Authenticate with n8n backend using the Keycloak token
		// This requires the backend to validate the token and create/update the user
		await authenticateWithBackend(token, tokenParsed, idTokenParsed);

		loading.value = false;

		toast.clearAllStickyNotifications();

		if (settingsStore.isMFAEnforced && !usersStore.currentUser?.mfaAuthenticated) {
			await router.push({ name: VIEWS.PERSONAL_SETTINGS });
			return;
		}

		telemetry.track('User attempted to login', {
			result: 'success',
			method: 'keycloak',
		});

		if (isRedirectSafe()) {
			const redirect = getRedirectQueryParameter();
			if (redirect.startsWith('http')) {
				window.location.href = redirect;
				return;
			}

			void router.push(redirect);
			return;
		}

		await router.push({ name: VIEWS.HOMEPAGE });
	} catch (error) {
		console.error('Authentication error:', error);
		loading.value = false;
		toast.showError(error, locale.baseText('auth.signin.error'));

		telemetry.track('User attempted to login', {
			result: 'keycloak_error',
		});
	}
};

const handleAuthError = (event: CustomEvent) => {
	console.error('Keycloak authentication error:', event.detail);
	toast.showError(
		new Error(event.detail.error || 'Authentication failed'),
		locale.baseText('auth.signin.error'),
	);

	telemetry.track('User attempted to login', {
		result: 'keycloak_failed',
	});
};

const handleLogout = () => {
	console.log('User logged out from Keycloak');
	void usersStore.logout();
};

const authenticateWithBackend = async (token: string, tokenParsed: any, idTokenParsed: any) => {
	// Call the n8n backend OIDC callback endpoint to validate the token
	// and create/update the user session
	const response = await fetch('/rest/sso/oidc/callback', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			token,
			tokenParsed,
			idTokenParsed,
		}),
		credentials: 'include', // Important to include cookies
	});

	if (!response.ok) {
		throw new Error('Failed to authenticate with n8n backend');
	}

	// Fetch the current user after successful authentication
	await usersStore.loginWithCookie();
	await settingsStore.getSettings();
};

onMounted(() => {
	// Add event listeners for dash-button events
	if (dashButtonRef.value) {
		dashButtonRef.value.addEventListener('authSuccess', handleAuthSuccess as EventListener);
		dashButtonRef.value.addEventListener('authError', handleAuthError as EventListener);
		dashButtonRef.value.addEventListener('logout', handleLogout as EventListener);
	}
});

const {
	settings: { releaseChannel },
} = useSettingsStore();
</script>

<template>
	<div :class="$style.container">
		<N8nLogo size="large" :release-channel="releaseChannel" />
		<div :class="$style.infoText">
			<p>{{ locale.baseText('auth.signinWithKeycloak') }}</p>
		</div>
		<div :class="$style.dashButtonContainer">
			<dash-button
				ref="dashButtonRef"
				:keycloak-uri="keycloakConfig.uri"
				:realm="keycloakConfig.realm"
				:client-id="keycloakConfig.clientId"
				login-method="login-required"
				:show-user-info="true"
			/>
		</div>
		<div v-if="loading" :class="$style.loadingContainer">
			<div :class="$style.spinner" />
			<p>{{ locale.baseText('auth.signingIn') }}</p>
		</div>
	</div>
</template>

<style lang="scss" module>
body {
	background-color: var(--color--background--light-2);
}

.container {
	display: flex;
	align-items: center;
	flex-direction: column;
	padding-top: var(--spacing--2xl);
	min-height: 100vh;

	> * {
		width: 352px;
	}
}

.infoText {
	text-align: center;
	margin-top: var(--spacing--lg);
	margin-bottom: var(--spacing--md);
	color: var(--color--text);
	font-size: var(--font-size--sm);
}

.dashButtonContainer {
	display: flex;
	justify-content: center;
	align-items: center;
	margin-top: var(--spacing--md);
	width: 100%;
}

.loadingContainer {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-top: var(--spacing--lg);
	color: var(--color--text);
}

.spinner {
	border: 3px solid var(--color--foreground--tint-1);
	border-top: 3px solid var(--color--primary);
	border-radius: 50%;
	width: 40px;
	height: 40px;
	animation: spin 1s linear infinite;
	margin-bottom: var(--spacing--xs);
}

@keyframes spin {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}
</style>
