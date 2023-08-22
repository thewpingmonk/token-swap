const qs = require('qs');
const Web3 =  require("web3");
const abi = require("./erc20abi.json");
let currentTrade = {};
let currentSelectSide;
async function init()
{
    const response = await fetch('https://tokens.coingecko.com/uniswap/all.json');
    const tokenLists = await response.json();
    const tokens = tokenLists.tokens;
    //console.log(tokens);
    const parent = document.getElementById("token_lists");
    tokens.map((token)=>{
        const div = document.createElement("div");
        div.className = "token_row";

        let html = `<img class = "token_list_img" src="${token.logoURI}"> <span class="token_list_text">${token.symbol}</span>`
        div.innerHTML = html;
        div.onclick = ()=>{
            selectToken(token);
        };
        parent.appendChild(div);
    })
}
function selectToken(token){
    closeModal();
    currentTrade[currentSelectSide] = token;
    renderInterface();
}
function renderInterface(){
    if(currentTrade.from)
    {
        document.getElementById("from_token_img").src = currentTrade.from.logoURI;
        document.getElementById("from_token_text").innerHTML = currentTrade.from.symbol;
    }
    if(currentTrade.to)
    {
        document.getElementById("to_token_img").src = currentTrade.to.logoURI;
        document.getElementById("to_token_text").innerHTML = currentTrade.to.symbol;
    }
}
async function getPrice()
{
    if(!currentTrade.to || !currentTrade.from || !document.getElementById("from_amount").value) return;
    let amount = document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals;
    const parms={
        sellToken: currentTrade.from.address,
        buyToken : currentTrade.to.address,
        sellAmount : amount,
    }
    const headers = '0x-api-key: [097e7bcc-2ebd-448e-8132-98c8374efda4]';
    //fetch the swap price
    const response = await fetch(`https://api.0x.org/swap/v1/price?${qs.stringify(parms)}` , {
        headers:{
            "0x-api-key" : "097e7bcc-2ebd-448e-8132-98c8374efda4",
        }
    });
    swapPriceJSON= await response.json();
    console.log(swapPriceJSON);
    document.getElementById("to_amount").value = swapPriceJSON.buyAmount /(10 ** currentTrade.to.decimals);
    document.getElementById("gas_estimate").innerHTML = swapPriceJSON.estimatedGas;
}
async function getQuote(account)
{
    if(!currentTrade.to || !currentTrade.from || !document.getElementById("from_amount").value) return;
    let amount = document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals;
    const parms={
        sellToken: currentTrade.from.address,
        buyToken : currentTrade.to.address,
        sellAmount : amount,
        takerAddress: account,
    }
    const headers = '0x-api-key: [097e7bcc-2ebd-448e-8132-98c8374efda4]';
    //fetch the swap price
    const response = await fetch(`https://api.0x.org/swap/v1/price?${qs.stringify(parms)}` , {
        headers:{
            "0x-api-key" : "097e7bcc-2ebd-448e-8132-98c8374efda4",
        }
    });
    swapQuoteJSON= await response.json();
    console.log(swapQuoteJSON);
    document.getElementById("to_amount").value = swapQuoteJSON.buyAmount /(10 ** currentTrade.to.decimals);
    document.getElementById("gas_estimate").innerHTML = swapQuoteJSON.estimatedGas;
    return swapQuoteJSON;
}
async function trySwap()
{
    let accounts = await ethereum.request({method : "eth_accounts"});
    const takerAddress = accounts[0];
    console.log("taker Address : " , takerAddress)
    const swapQuoteJSON = await getQuote(takerAddress);

    // Set token allowance
    //const web3 = new Web3(Web3.givenProvider);
    await window.ethereum.request({method: 'eth_requestAccounts'});
    window.web3 = new Web3(window.ethereum);// to connect with metamask

    const fromTokenAddress = currentTrade.from.address;
    const ERC20TokenContract = new web3.eth.Contract(abi , fromTokenAddress);
    console.log("setup ERC20 token; ", ERC20TokenContract);

    //const maxApproval = new BigInt("2").pow(256).minus(1);
    const amount = document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals;

    await ERC20TokenContract.methods.approve(
        swapQuoteJSON.allowanceTarget,
        amount,
    ).send({from:takerAddress}).then(tx=>{console.log("tx: " , tx)});

    const receipt = await window.web3.eth.sendTransaction(swapQuoteJSON);
    alert("Receipt " , receipt)
}
init();
async function connect(){
    if(typeof window.ethereum !== "undefined")
    {
        try{
            await ethereum.request({method : "eth_requestAccounts"});
        }
        catch(error)
        {
            console.log(error);
        }
        document.getElementById("login_button").innerHTML = "Connected";
        document.getElementById("swap_button").disabled = false;
    }
    else
    {
        document.getElementById("login_button").innerHTML = "Please install Metamask";
    }
}
function openModal(side)
{
    currentSelectSide = side;   
    document.getElementById("token_modal").style.display = "block";
}
function closeModal()
{
    document.getElementById("token_modal").style.display = "none";
}
document.getElementById("login_button").onclick = connect;
document.getElementById("from_token_select").onclick =()=>{
    openModal("from");
    
} 
document.getElementById("to_token_select").onclick =()=>{
    openModal("to");
    
} 
document.getElementById("modal_close").onclick = closeModal;
document.getElementById("from_amount").onblur = getPrice;
document.getElementById("swap_button").onclick = trySwap;


//browserify index.js -o bundle.js