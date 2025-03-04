import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
Course: a
    .model({
      courseID: a.string().required(),
      title: a.string(),
      description: a.string(),
      difficulty: a.string(),
      duration: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  Lecture: a
    .model({
      courseID: a.string().required(),
      lectureID: a.string().required(),
      title: a.string(),
      content: a.string(),
      summary: a.string(),
      difficulty: a.string(),
      duration: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  Quiz: a
    .model({
      courseID: a.string().required(),
      lectureID: a.string().required(),
      question: a.string(),
      options:a.string().array(),
      answer: a.string(),
      explanation: a.string(),
      difficulty: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
