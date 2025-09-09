export const ContentCreatorSearchSchema = {
  type: 'object',
  properties: {
    firstName: {
      type: 'string',
      title: 'Search by Name',
      description: 'Enter first name to search for content creators',
    },
  },
};

export const ContentCreatorUISchema = {
  'ui:order': ['firstName'],
  firstName: {
    'ui:placeholder': 'Enter content creator name to search...',
    'ui:widget': 'text',
  },
};
