import { useState, useEffect } from 'react';
import { NFTStorage, File } from 'nft.storage';
import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import axios from 'axios';
import './index.css'
import './App.css';
import mainImage from '../src/images/img-header.png';

// Components
import Spinner from 'react-bootstrap/Spinner';
import PhoneCard from './components/PhoneCard';
import ChatBot from './components/ChatBot';
import Login from './components/Login';

// ABIs
import MintedABI from './abis/MintedABI.json';

const mintedAddress = "0x184CE4383e9554356c4b66Ed7FB7d441DbD7e12E";

function App() {
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null); // State for the generated image
  const [uploadedImage, setUploadedImage] = useState(null); // State for the uploaded image file
  const [isUploaded, setIsUploaded] = useState(false); // State to track if an image is uploaded
  const [url, setURL] = useState(null);
  const [message, setMessage] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);
  const [isImageReady, setIsImageReady] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([
    { text: "Hi! I'm here to help you with Minted AI DApp. What would you like to know?", isBot: true }
  ]);

  useEffect(() => {
    // Check if user was previously authenticated
    const checkAuthStatus = async () => {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          handleLogin(accounts[0]);
        }
      }
    };
    
    checkAuthStatus();
  }, []);

  const handleLogin = async (address) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Set up the contract
      const contract = new ethers.Contract(mintedAddress, MintedABI, signer);
      
      setContract(contract);
      setAccount(address);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error during login:', error);
      setIsAuthenticated(false);
    }
  };

  const handleLogout = () => {
    setContract(null);
    setAccount(null);
    setIsAuthenticated(false);
    // Reset other necessary state variables
    setName("");
    setDescription("");
    setImage(null);
    setUploadedImage(null);
    setIsUploaded(false);
    setURL(null);
    setMessage("");
    setIsWaiting(false);
    setIsImageReady(false);
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (name === "" || description === "") {
      window.alert("Please provide a name and description");
      return;
    }

    setIsWaiting(true);

    // Call AI API to generate an image based on the description
    const imageData = await createImage();

    // Upload the image to IPFS (NFT.Storage)
    const url = await aiImage(imageData);

    // Update the image readiness state
    setIsImageReady(true);

    // Set the URL
    setURL(url);

    setIsWaiting(false);
    setMessage("");
  };

  const createImage = async () => {
    setMessage("Generating Image...");

    try {
      // Check if API key exists
      const apiKey = process.env.REACT_APP_HUGGING_FACE_API_KEY;
      if (!apiKey) {
        throw new Error('Hugging Face API key is not configured. Please check your .env file.');
      }

      console.log('Using API key:', apiKey); // Temporary log to debug

      const response = await axios({
        url: URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          key: apiKey,
          prompt: description,
          negative_prompt: "blurry, bad quality, distorted, deformed, ugly, bad anatomy",
          width: "512",
          height: "512",
          samples: "1",
          num_inference_steps: "20",
          seed: null,
          guidance_scale: 7.5,
          safety_checker: "yes",
          multi_lingual: "no",
          panorama: "no",
          self_attention: "no",
          upscale: "no",
          embeddings_model: null,
          webhook: null,
          track_id: null
        }
      });

      console.log('Image generation response:', response.data);

      if (response.data.status === 'success') {
        const imageUrl = response.data.output[0];
        setImage(imageUrl);
        return imageUrl;
      } else if (response.data.status === 'processing') {
        // Handle async generation
        const fetchResult = async () => {
          const resultResponse = await axios.post(
            'https://stablediffusionapi.com/api/v3/fetch',
            {
              key: apiKey,
              request_id: response.data.id
            }
          );
          return resultResponse.data;
        };

        // Poll for result with exponential backoff
        let result;
        let retryCount = 0;
        const maxRetries = 10;
        const baseDelay = 3000; // Start with 3 seconds

        while (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(1.5, retryCount)));
          result = await fetchResult();
          
          if (result.status === 'success') {
            const imageUrl = result.output[0];
            setImage(imageUrl);
            return imageUrl;
          } else if (result.status === 'failed') {
            throw new Error(result.message || 'Image generation failed');
          }
          
          retryCount++;
        }
        throw new Error('Image generation timed out');
      } else {
        throw new Error(response.data.message || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      if (error.response) {
        // The request was made and the server responded with an error
        console.error('API Error Response:', error.response.data);
        throw new Error(`API Error: ${error.response.data.error || error.response.data.message || 'Unknown API error'}`);
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('No response received from the API server');
      } else {
        // Something happened in setting up the request
        throw error;
      }
    }
  };

  const handleFileInputChange = async (e) => {
    const file = e.target.files[0];
    setUploadedImage(file);
  
    if (file) {
      setIsUploaded(true);
      setIsImageReady(false); // Reset image readiness
  
      // Upload the image to NFT.Storage
      const imageUrl = await uploadImage(file);

      // Update the image readiness state
      setIsImageReady(true);
  
      // Update the URL
      setURL(imageUrl);
    }
  };
  
  const handleUpload = () => {
    // Trigger the hidden file input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleRemove = () => {
    setUploadedImage(null);
    setIsUploaded(false);
    setIsImageReady(false);
  };

  const uploadImage = async (imageData) => {
    setMessage("Uploading Image...");

    try {
      if (!process.env.REACT_APP_NFT_STORAGE_API_KEY) {
        throw new Error('NFT.Storage API key is not configured');
      }

      // Create an instance of NFT.Storage
      const nftstorage = new NFTStorage({ token: process.env.REACT_APP_NFT_STORAGE_API_KEY });

      // Create a Blob from the image data if it's a URL
      let imageFile;
      if (typeof imageData === 'string' && imageData.startsWith('http')) {
        const response = await fetch(imageData);
        const blob = await response.blob();
        imageFile = new File([blob], 'image.jpeg', { type: 'image/jpeg' });
      } else if (imageData instanceof File) {
        imageFile = imageData;
      } else {
        throw new Error('Invalid image data format');
      }

      // Prepare metadata
      const metadata = {
        name,
        description,
        image: imageFile
      };

      // Store the NFT data
      const result = await nftstorage.store(metadata);

      // Get the IPFS URL for the metadata
      const url = `https://ipfs.io/ipfs/${result.ipnft}/metadata.json`;
      
      setMessage("Image uploaded successfully!");
      return url;
    } catch (error) {
      console.error('Error uploading to NFT.Storage:', error);
      setMessage(`Failed to upload image: ${error.message}`);
      throw error;
    }
  };

  const aiImage = async (imageData) => {
    return await uploadImage(imageData);
  };

  const handleMint = async () => {
    if (!contract) {
      setMessage("Please connect your wallet first");
      return;
    }

    if (!url) {
      setMessage("Please generate or upload an image first");
      return;
    }

    try {
      setMessage("Minting NFT...");
      setIsWaiting(true);

      // Call the smart contract's mint function
      const transaction = await contract.mint(url);
      await transaction.wait();

      setMessage("NFT Minted Successfully!");
    } catch (error) {
      console.error('Error minting NFT:', error);
      setMessage(`Failed to mint NFT: ${error.message}`);
    } finally {
      setIsWaiting(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
  
    // Add user message
    setMessages(prev => [...prev, { text: inputText, isBot: false }]);

    const API_KEY = process.env.REACT_APP_GEMINI_API_KEY; // Ensure this is set in your .env file
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  
    try {
      const response = await axios.post(API_URL,{
        headers: {
          "Content-Type": "application/json"
        },
        messages:[
            {
                role:"system",
                content:"You are a helpful assiant for the Minted AI DApp, which helps users create and mint NFT using AI-generate is images. Provide concise, helpful answers about wallet connetion, NFT minting, and AI image generation"
            },{
                role : "user",
                content: inputText
            }],
    });

    const botResponse = response.data.choices[0].message.content;
    setMessages(prev => [...prev, { text: botResponse, isBot: true }]);
  } catch (error) {
    console.error('Error:', error);
    setMessages(prev => [...prev, { 
      text: "Sorry, I'm having trouble responding right now. Please try again.", 
      isBot: true 
    }]);
  }

  setInputText('');
};

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="main text-center mt-4">
      <div className="header-container">
        <img src={mainImage} className="main-image" alt="mainImage" />
        <button className="logout-button" onClick={handleLogout}>
          Disconnect Wallet
        </button>
      </div>
      <h1>Create and Trade AI-Driven NFTs</h1>
      <p>Connected Address: {account}</p>
      <p>
        Unleash your creativity with AI-powered image generation and mint your creations into NFTs for the blockchain art market.
      </p>
      <br/>
      <h3>
        How to Use:
      </h3>
      <PhoneCard />
      <div className="main-inputs">
        <p className='inputs'>Enter Name:</p>
        <input
          type="text"
          placeholder="ex. My First NFT"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p className='inputs'>Enter Description:</p>
        <input
          type="text"
          placeholder="ex. Cat swimming in the ocean"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="buttons-container">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            id="fileInput"
            style={{ display: 'none' }}
          />

          <button
            className="btn upload-btn"
            onClick={handleUpload}
          >
            {isUploaded ? 'Uploaded' : 'Upload Image'}
          </button>

          {isUploaded && (
            <button
              className="btn remove-btn"
              onClick={handleRemove}
            >
              Remove
            </button>
          )}
          
          <button className="btn generate-btn" onClick={submitHandler}>
            Generate
          </button>
        </div>
      </div>

      <div className="image-container">
        <div className="image">
          {!isWaiting && (isUploaded ? uploadedImage : image) ? (
            <img src={isUploaded ? URL.createObjectURL(uploadedImage) : image} alt="Generated image" />
          ) : (
            isWaiting && (
              <div className="image__placeholder">
                <Spinner animation="border" />
                <p>{message}</p>
              </div>
            )
          )}

        </div>
        {isImageReady && (
      <button
        className="btn mint-btn"
        onClick={() => {
          if (name === "" || description === "") {
            window.alert("Please provide a name and description");
            return;
          }
          handleMint();
        }}
      >
        Mint
      </button>
    )}
      </div>
      <ChatBot/>
    </div>
  );
}

export default App;
