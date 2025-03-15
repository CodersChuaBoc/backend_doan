export default {
  routes: [
    {
     method: 'POST',
     path: '/contact',
     handler: 'contact.sendContact',
     config: {
       policies: [],
       middlewares: [],
     },
    },
  ],
};
