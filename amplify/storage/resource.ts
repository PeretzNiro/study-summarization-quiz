import { defineStorage } from '@aws-amplify/backend';
import { displayLecture } from '../functions/displayLecture/resource';
 
export const lectures = defineStorage({
  name: 'lectures',
  access: (allow) => ({
    'python/*': [
      allow.authenticated.to(['read', 'write'])
    ],
  })
});