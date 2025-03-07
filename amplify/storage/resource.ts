import { defineStorage } from '@aws-amplify/backend';

export const lectures = defineStorage({
  name: 'lectures',
  isDefault: true,
  access: (allow) => ({
    'protected/*': [
      allow.groups(['admin']).to(['read', 'write', 'delete']),
    ],
  })
});