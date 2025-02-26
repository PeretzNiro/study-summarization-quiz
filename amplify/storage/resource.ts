import { defineStorage } from '@aws-amplify/backend';
import { displayLecture } from '../functions/displayLecture/resource';
 
export const lectures = defineStorage({
  name: 'lectures',
  access: (allow) => ({
    'python/*': [
      allow.resource(displayLecture).to(['read']),
    ],
  })
});