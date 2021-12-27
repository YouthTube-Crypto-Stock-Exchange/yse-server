// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

contract YouthToken {

    struct Inf{
        uint numShares;
        uint curPrice;
        mapping(string => uint)shares;
    }

    mapping(string => Inf) public globalShares;
    mapping(string => uint) public balances;
    mapping(string => string) public names;
    //to store the amount allowe to be withdrawed from one account by another
    mapping(string => mapping(string => uint256)) private allowances;

    uint256 private totalSupply; //total supply of tokens
    uint256 private priceOfToken; //price of one token in ether

    string private name; // name of the token
    string private symbol; // symbol of the token
    
    address private deployer; // deployer of the token gets access to mint new tokens
    
    // event to fire when a transfer of tokens occur
    event BuyTokens(address indexed from, string to, uint256 value);
    event SellTokens(string from, address indexed to, uint256 value);
    event TransferInternal(string sender,string receiver,uint256 value);
    // event to fire when an owner approves a certain amount of token to be withdrawed by the spender
    event Approval(string indexed owner, string indexed spender, uint256 value);

    event ITORelease(string id,uint numShares,uint curPrice,string name);
    event UserCreation(address indexed owner,string id,uint numYouthTokens,string name);

    // initialise the values
    constructor(string memory name_, string memory symbol_, uint256 totalSupply_, uint256 priceOfToken_) {
        name = name_;
        symbol = symbol_;
        totalSupply = totalSupply_;
        priceOfToken = priceOfToken_;
        deployer = msg.sender;
    }

    function getPriceOfToken() view public returns(uint) {
        return priceOfToken;
    }

    function ITO(uint _numShares,uint _curPrice,string memory id) public{
        Inf storage newInfluencer = globalShares[id];
        newInfluencer.numShares = _numShares;
        newInfluencer.curPrice = _curPrice;
        emit ITORelease(id,_numShares,_curPrice,names[id]);
        //addSellToBook(name,_curPrice,_numShares);
    }

    function createUser(string memory id, uint numYouthTokens,string memory name) public{
        balances[id]=numYouthTokens;
        names[id]=name;
        emit UserCreation(msg.sender,id,numYouthTokens,name);
    }

    function increaseShares(string memory inf,string memory owner,uint numShares, uint newBalance) public{
        globalShares[inf].shares[owner] += numShares;
        balances[owner] = newBalance;
    }

    function decreaseShares(string memory inf,string memory owner,uint numShares, uint newBalance) public{
        globalShares[inf].shares[owner] -= numShares;
        balances[owner] = newBalance;
    }

    function addShares(string memory inf,string memory owner,uint numShares, uint newBalance) public{
        globalShares[inf].shares[owner] = numShares;
        balances[owner] = newBalance;
    }

    function deleteShares(string memory inf,string memory owner,uint numShares, uint newBalance) public{
        delete globalShares[inf].shares[owner];
        balances[owner] = newBalance;
    }

    // returns the name of the token
    function nameOfToken() public view returns (string memory) {
        return name;
    }
    
    // returns the symbol of the token
    function symbolOfToken() public view returns (string memory) {
        return symbol;
    }
    
    // returns the number of decimals accepted in the token value
    function decimals() public pure returns (uint8) {
        return 18;
    }

    // returns the total supply of the tokens
    function getTotalSupply() external view returns (uint256) {
        return totalSupply;
    }

    // returns the balance of the specified account
    function balanceOf(string memory account) public view returns (uint256) {
        return balances[account];
    }
    
    // function to transfer amount number of tokens from the caller to the recepient
    function transfer(string memory sender, string memory recipient, uint256 amount) public returns (bool) {
        // calls the _transfer function (Note: As transfer of tokens is called multiple times
        // its better to make a separate function and reuse it instead of writing again)
        _transfer(sender, recipient, amount);
        return true;
    }

    // returns the amount of the tokens spender can spend from the owner's account
    function allowance(string memory owner, string memory spender) public view returns (uint256) {
        return allowances[owner][spender];
    }
    
    // function to approve amount number of tokens to be spend by the spender from the caller's account
    function approve(string memory approver,string memory spender, uint256 amount) public returns (bool) {
        // calls the _approve function (Note: As approve of tokens is called multiple times
        // its better to make a separate function and reuse it instead of writing again)
        _approve(approver,spender,amount);

        return true;
    }
    
    // function to transfer amount number of tokens from the sender's account to recipient's account
    function transferFrom(string memory sender,string memory recipient,uint256 amount) public returns (bool) {

        // first check if amount of tokens being transferred are not being exceeded from what
        // has been allowed by the sender
        uint256 currentAllowance = allowances[sender][recipient];
        require(currentAllowance >= amount, "YouthToken: transfer amount exceeds allowance ");
        
        // transfer the tokens
        _transfer(sender, recipient, amount);
        
        // decrease the amount of the allowed tokens
        unchecked {
            _approve(sender, recipient, currentAllowance - amount);
        }

        return true;
    }
    
    // function to mint new tokens (Note : Only allowed by the owner of the contract)
    function mint(uint256 amount) public returns (uint256) {
        // check if the minter is the owner of the contract
        require(msg.sender == deployer, "YouthToken: only the owner can mint new tokens.");

        // increase the total supply of the tokens
        totalSupply += amount;
       
        return totalSupply;
    }
    
    // function to burn the tokens from a specific account to create inflation
    function burn(uint256 amount) public returns (uint256) {

        address account = msg.sender;
        // check if the burning account is not zero address
        require(account != deployer, "YouthToken: burn from the non deployer address");

        require(totalSupply >= amount, "YouthToken: burn amount exceeds balance");

        // decrease the tokens from the total supply
        totalSupply -= amount;

        return totalSupply;
    }
    
    // function to buy new tokens by spending ether
    function buy(string memory buyer,uint256 amount) payable public returns (bool){
        // check if the total ether supplied is equal to the total price of the amount of the tokens to be bought
        require(msg.value == amount*priceOfToken*(10**18) , "YouthToken: Insufficient or Excess supply of funds");
        
        // check if there are enough number of tokens to be bought
        require(totalSupply >= amount,"YouthToken: Available tokens less than the required amount");
        
        // increase the balance of the caller
        balances[buyer] += amount;

        // decrement the total supply of the tokens
        unchecked{
            totalSupply -= amount;
        }

        // here the tokens are transferred from the contract to the caller's account
        emit BuyTokens(msg.sender, buyer, amount);
        return true;
    }
    
    // function to sell the tokens and transfer ether back to the owner
    function sell(uint256 amount,string memory seller,address payable _deployer) public returns (bool){
        // check if the account of the caller contains atleast amount number of tokens
        require(balances[seller] >= amount , "YouthToken: Insufficient token balance");

        // check if the contract has enough funds to pay ether in exchange of tokens
        require(address(this).balance >= amount*priceOfToken,"YouthToken: Insufficient funds in the contract");
        
        // transfer ether to the owner
        _deployer.transfer(amount*priceOfToken);

        // increase the total supply of tokens
        totalSupply += amount;

        // decrease the token balance of the caller's account
        unchecked{
            balances[seller] -= amount;
        }

        // here the tokens are transferred from the caller's account to the contract account
        emit SellTokens(seller, msg.sender, amount);
        return true;
    }
    
    // returns the total balance of the contract account in terms of ether
    function getContractBalance() public view returns(uint256){
        return address(this).balance;
    } 
    
    // function to transfer amount number of tokens from sender to the recepient
    function _transfer(string memory sender,string memory recipient,uint256 amount) internal {

        // check if the sender has balance that is claimed
        uint256 senderBalance = balances[sender];
        require(senderBalance >= amount, "YouthToken: transfer amount exceeds balance");
        
        // decrease the balance of tokens from the sender's account
        unchecked {
            balances[sender] = senderBalance - amount;
        }
        // increase the balance of tokens from the recepient's account
        balances[recipient] += amount;

        // here the transfer event is triggered from sender to recepient
        emit TransferInternal(sender, recipient, amount);
    }
    
    // function to approve spender to spend amount number of tokens from the owner's account
    function _approve(string memory owner,string memory spender,uint256 amount) internal{

        // check if the owner has the balance that is approved
        require(balances[owner] >= amount, "YouthToken: approve amount less than the current balance");
        
        // set the allowance
        allowances[owner][spender] = amount;

        // here the spender is approved to spend amount number of tokens from the owner
        emit Approval(owner, spender, amount);
    }
}