export default {
  routes: [
    {
     method: 'POST',
     path: '/chat',
     handler: 'chat.sendMessage',
     config: {
       policies: [],
       middlewares: [],
     },
    },
    {
      method: 'GET',
      path: '/chat/messages',
      handler: 'chat.getMessages',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
