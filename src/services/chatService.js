import { apiClient } from './api';

const chatService = {
  // Send message to AI
  sendMessage: async (message) => {
    const response = await apiClient.post('/chat', { message });
    return response;
  },

  // Clear chat history
  clearChat: async () => {
    const response = await apiClient.delete('/chat');
    return response;
  },
};

export default chatService;
