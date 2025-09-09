// Role ID mapping for different user types
// These IDs match the actual role IDs from app.constant.ts
export const ROLE_IDS = {
  LEARNER: '4662bd9c-398b-49fe-b599-692063ff7aec', // From your curl example
  CONTENT_CREATOR: '45b8b0d7-e5c6-4f3f-a7bf-70f86e9357ce', // From app.constant.ts
  CONTENT_REVIEWER: '2dc13fcc-29c4-42c1-b125-82d3dcaa4b42', // From app.constant.ts
} as const;

export const getUserTypeRoleId = (userType: 'learner' | 'content-creator' | 'content-reviewer'): string => {
  switch (userType) {
    case 'learner':
      return ROLE_IDS.LEARNER;
    case 'content-creator':
      return ROLE_IDS.CONTENT_CREATOR;
    case 'content-reviewer':
      return ROLE_IDS.CONTENT_REVIEWER;
    default:
      throw new Error(`Unknown user type: ${userType}`);
  }
};
