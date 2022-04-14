## Setup

- Step 1 : Paste the contract.sol in Remix IDE
- Step 2 : Open Ganache and make sure it is running
- Step 3 : Compile the solidity code & copy paste the abi in abi.js
- Step 4 : In solidity deployment change the environment as Web3 provider and change the port number to 7545. Now we can see it is connected to ganache blockchain at network id 5777
- Step 5 : Deploy the smart contract and copy paste the contract address in the env
- Step 6 : Copy paste the public and private key of the ganache's first account(any account would do) in the env
- Step 7 : `npm install` all the libraries in package.json
- Step 8 : make sure mongodb is installed and the service is running. type `mongo` to check the status.
- Step 9 : Run the application using the command `node app` or `npm run start`

## Expected env

- PORT (Server port)
- MONGO_STRING (Mongo DB Uri)
- CONTRACT_ADDRESS (Deployed Contract Address)
- PROVIDER_URL (Web3 provider url)
- PUBLIC_ADDRESS (Account address on the provider's blockchain)
- PRIVATE_KEY (Associated private key for transactions)