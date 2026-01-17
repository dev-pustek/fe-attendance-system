/**
 * Get the user ID, preferring public_id over id
 * Since the backend primarily uses public_id, this ensures compatibility
 */
export const getUserId = (user: { id?: string; public_id: string }): string => {
  return user.public_id || user.id || '';
};
