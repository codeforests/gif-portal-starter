import React, { useEffect, useState } from 'react';

import twitterLogo from './assets/twitter-logo.svg';
import './App.css';

import idl from './assets/idl.json';
import kp from './keypair.json'

import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';

// Constants
const TWITTER_HANDLE = 'codeforests';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const TEST_GIFS = [
	'https://i.giphy.com/media/L59aKIC2MFyfUfrz3n/giphy.webp',
	'https://i.giphy.com/media/JTV3ciE3YTDycJXhmq/giphy.webp',
	'https://media0.giphy.com/media/Eo0qemXgXQ2j47Pd5J/giphy.webp?cid=ecf05e47n4hltq7qgb25ukkvysnm9bopwlrq6lpl3jtfd0cy&rid=giphy.webp&ct=g',
	'https://i.giphy.com/media/mG2VJTfGpaUBlCuQFE/giphy.webp'
]


const { SystemProgram, Keypair } = web3;
const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)
const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl('devnet');
const opts = {
  preflightCommitment: "processed"
}




const App = () => {

  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, 
      window.solana,
      opts.preflightCommitment,
    );
    return provider;
  }

  const checkIfWalletIsConnected = async () => {

    try {
      const { solana } = window;
      if(solana) {
        if(solana.isPhantom) {
          console.log("Phantom wallet found");

          const response = await solana.connect({onlyIfTrusted : true});
          console.log('connect with public key ', response.publicKey.toString());
          setWalletAddress(response.publicKey.toString());
        }
        else {
          alert("Please install Phantom wallet");
        }
      }
    } catch(error) {
      console.error(error);
    }
  }

  useEffect( () => {

    const onLoad = async () => {
      await checkIfWalletIsConnected();
    }
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  useEffect( () => {
    if(walletAddress) {
      console.log("retrieve GIF list");
      getGifList();
    }
  }, [walletAddress]);

  const connectWallet = async () => {

    const { solana } = window;
    if(solana) {
      const response = await solana.connect();
      setWalletAddress(response.publicKey.toString());
    }
  };

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping")
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
      await getGifList();
  
    } catch(error) {
      console.log("Error creating BaseAccount account:", error)
    }
  }

  const getGifList = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
      
      console.log("Got the account", account)
      setGifList(account.gifList)
  
    } catch (error) {
      console.log("Error in getGifList: ", error)
      setGifList(null);
    }
  }


  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  }

  const submitGIF = async () => {
    if (inputValue.length === 0) {
      console.log("No gif link given!")
      return
    }
    setInputValue('');
    console.log('Gif link:', inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
  
      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("GIF successfully sent to program", inputValue)
  
      await getGifList();
    } catch (error) {
      console.log("Error sending GIF:", error)
    }
  }

  const renderNotConnectedContainer = () => (
    <button
    className='cta-button connect-wallet-button'
    onClick={connectWallet}>
      Connect To Wallet
    </button>
  );

  const renderConnectedContainer = () => {
    if(gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      );
    } 
    else {
      return (
        <div className="connected-container">
        <form onSubmit={(event) => {
          event.preventDefault();
          submitGIF();
        }}>
          <input type='text' placeholder='Enter GIF link' value={inputValue} onChange={onInputChange} />
          <button type='submit' className='cta-button submit-gif-button'>Submit</button>
        </form>
        <div className="gif-grid">
          {gifList.map(gif => (
            <div className="gif-item" key={gif}>
              <img src={gif.gifLink} alt={gif.gifLink} />
              <p className='sub-text'> {gif.userAddress.toString()}</p>
            </div>
          ))}
        </div>
      </div>
      );
    }
  };

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header gradient-text">Crypto Meme GIF Portal</p>
          <p className="sub-text">
            View your crypto meme GIF collection in the metaverse ✨
          </p>
          { !walletAddress ? renderNotConnectedContainer() : renderConnectedContainer()}
        </div>
        <div className={walletAddress ? 'authed-container' : 'container'}></div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
