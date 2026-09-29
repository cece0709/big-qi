import { requireOptionalNativeModule } from 'expo-modules-core';
import type { FocusGuardNativeModule } from './FocusGuard.types';

/** Null in Expo Go, web preview, iOS, and Android builds made before this module existed. */
export default requireOptionalNativeModule<FocusGuardNativeModule>('FocusGuard');
