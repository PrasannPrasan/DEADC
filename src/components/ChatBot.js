import React, { useState } from 'react';
import axios from 'axios';
import './ChatBot.css';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
    { text: "Hi! I'm here to help you with Minted AI DApp. What would you like to know?", isBot: true }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    // Add user message
    setMessages(prev => [...prev, { text: inputText, isBot: false }]);
    setIsLoading(true);

    try {
      const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
      if (!API_KEY) {
        throw new Error('Gemini API key is not configured');
      }
      
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: "You are a helpful assistant for the Minted AI DApp. You help users with wallet connection, NFT minting, and AI image generation. Keep responses concise and focused."
                }
              ]
            },
            {
              role: "model",
              parts: [
                {
                  text: "I understand. I'll help users with their questions about the Minted AI DApp, focusing on wallet connections, NFT minting, and AI image generation. I'll keep my responses concise and practical."
                }
              ]
            },
            {
              role: "user",
              parts: [
                {
                  text: inputText
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      let botResponse;
      console.log(response.data.candidates + " " + response.data.candidates[0].content.parts[0].text);
      if (response.data.candidates && response.data.candidates[0].content.parts[0].text) {
        botResponse = response.data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Invalid response format from Gemini API');
      }

      setMessages(prev => [...prev, { text: botResponse, isBot: true }]);
    } catch (error) {
      console.error('Error:', error);
      let errorMessage = 'An error occurred while processing your request.';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('API Error Response:', error.response.data);
        errorMessage = error.response.data.error?.message || errorMessage;
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response received from the server.';
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = error.message;
      }

      setMessages(prev => [...prev, {
        text: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        isBot: true
      }]);
    } finally {
      setIsLoading(false);
      setInputText('');
    }
  };

  return (
    <div className="chatbot-container">
      {!isOpen ? (
        <button 
          className="chatbot-button"
          onClick={() => setIsOpen(true)}
        >
          Need Help?
        </button>
      ) : (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <h4>Minted AI Assistant</h4>
            <button 
              className="close-button"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.isBot ? 'bot' : 'user'}`}
              >
                {message.text}
              </div>
            ))}
            {isLoading && (
              <div className="message bot loading">
                Typing...
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="chatbot-input">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your question..."
            />
            <button type="submit" disabled={isLoading}>Send</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBot;