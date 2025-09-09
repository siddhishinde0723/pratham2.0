export const ContentReviewerSearchSchema = {
  type: 'object',
  properties: {
    firstName: {
      type: 'string',
      title: 'Search by Name',
      description: 'Enter first name to search for content reviewers',
    },
  },
};

export const ContentReviewerUISchema = {
  'ui:order': ['firstName'],
  firstName: {
    'ui:placeholder': 'Enter content reviewer name to search...',
    'ui:widget': 'text',
  },
};
