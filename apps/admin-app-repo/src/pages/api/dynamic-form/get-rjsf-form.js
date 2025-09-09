import { validate } from 'uuid';

export default function handler(req, res) {
  // API disabled to prevent 500 errors
  res.status(200).json({
    schema: {},
    uiSchema: {},
    message: 'Dynamic form API disabled',
  });
}

const fetchFormFields = async (readForm) => {
  const axios = require('axios');
  let fields = [];
  for (let i = 0; i < readForm.length; i++) {
    let fetchUrl = readForm[i].fetchUrl;
    let header = readForm[i].header;
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: fetchUrl,
      headers: {
        Accept: '*/*',
        ...header,
      },
    };

    await axios
      .request(config)
      .then((response) => {
        fields = [...fields, ...response?.data?.result?.fields];
        // console.log('response', response?.data);
      })
      .catch((error) => {
        console.log('error', error);
      });
  }
  // console.log('field!!!', fields);
  return fields;
};

function normalizePattern(pattern) {
  if (typeof pattern === 'string') {
    return pattern.startsWith('/') && pattern.endsWith('/')
      ? pattern.slice(1, -1)
      : pattern;
  }
  return pattern;
}

function generateSchemaAndUISchema(fields) {
  const schema = {
    type: 'object',
    properties: {},
  };
  const uiSchema = {};

  fields.forEach((field) => {
    const {
      name,
      hint,
      label,
      placeholder,
      coreField,
      fieldId,
      type,
      options,
      pattern,
      isRequired,
      validation,
      maxLength,
      minLength,
      //custom field attributes
      api,
      extra,
    } = field;

    const schemaField = {
      type: 'string',
      title: label,
      coreField,
      fieldId,
      field_type: type,
    };

    if (pattern) {
      schemaField.pattern = normalizePattern(pattern);
    }
    if (validation?.maxSelections) {
      schemaField.maxSelection = parseInt(validation.maxSelections, 10);
    }
    if (validation?.isMultiSelect) {
      schemaField.isMultiSelect = validation.isMultiSelect;
      schemaField.uniqueItems = validation.isMultiSelect;
      schemaField.type = 'array';
    }
    if (validation?.isRequired) {
      schemaField.isRequired = validation.isRequired;
    }
    if (maxLength) {
      schemaField.maxLength = parseInt(maxLength, 10);
    }
    if (minLength) {
      schemaField.minLength = parseInt(minLength, 10);
    }
    if (isRequired) {
      schema.required = schema.required || [];
      schema.required.push(name);
    }
    // Handling UI Schema (including hint and placeholder)
    uiSchema[name] = {
      'ui:widget': 'text', // default widget
    };

    if (placeholder) {
      uiSchema[name]['ui:placeholder'] = placeholder;
    }

    if (hint) {
      uiSchema[name]['ui:help'] = hint;
    }

    if (type === 'radio') {
      schemaField.enum = options.map((opt) => opt.value);
      schemaField.enumNames = options.map((opt) => opt.label);
      uiSchema[name] = {
        'ui:widget': 'radio',
      };
    } else if (type === 'drop_down' || type === 'checkbox') {
      if (schemaField?.isMultiSelect === true) {
        schemaField.items = {
          type: 'string',
          enum: options.map((opt) => opt.value) || [],
          enumNames: options.map((opt) => opt.label) || [],
        };
      } else {
        schemaField.enum = options.map((opt) => opt.value) || [];
        schemaField.enumNames = options.map((opt) => opt.label) || [];
      }
      uiSchema[name] = {
        'ui:widget':
          type === 'checkbox'
            ? //? 'checkboxes'
              'CustomCheckboxWidget'
            : schemaField?.isMultiSelect === true
            ? 'CustomMultiSelectWidget'
            : 'select',
        'ui:options': {
          multiple: schemaField?.isMultiSelect === true ? true : false,
          uniqueItems: schemaField?.isMultiSelect === true ? true : false,
        },
      };
    } else if (type === 'date') {
      schemaField.format = 'date';
      uiSchema[name] = { 'ui:widget': 'date' };
    } else if (type === 'dateTime') {
      schemaField.format = 'date-time';
      uiSchema[name] = { 'ui:widget': 'dateTime' };
    } else {
      uiSchema[name] = { 'ui:widget': 'text' };
    }

    //Our custom RJSF field attributes
    if (api) {
      schemaField.api = api;
      if (schemaField?.isMultiSelect === true) {
        schemaField.items = {
          type: 'string',
          enum: [],
          enumNames: [],
        };
      } else {
        schemaField.enum = ['select'];
        schemaField.enumNames = ['Select'];
      }
    }

    if (extra) {
      schemaField.extra = extra;
    }

    schema.properties[name] = schemaField;
  });

  return { schema, uiSchema };
}
