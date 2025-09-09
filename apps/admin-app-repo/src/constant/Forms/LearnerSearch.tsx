export const learnerSearchSchema = {
  type: 'object',
  properties: {
    firstName: {
      type: 'string',
      title: 'Search by Name',
      description: 'Enter first name to search for learners',
    },
  },
};

export const learnerSearchUISchema = {
  'ui:order': ['firstName'],
  firstName: {
    'ui:placeholder': 'Enter learner name to search...',
    'ui:widget': 'text',
  },
};
