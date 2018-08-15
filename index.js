const EventEmitter = require('events').EventEmitter
const Wallet = require('ethereumjs-wallet')
const ethUtil = require('ethereumjs-util')
const type = 'MOAC Key Pair'
const sigUtil = require('eth-sig-util')

/*
 *
*/
class MoacKeyring extends EventEmitter {

  /* PUBLIC METHODS */

  constructor (opts) {
    super()
    this.type = type
    this.wallets = []
    this.deserialize(opts)
  }

  serialize () {
    return Promise.resolve(this.wallets.map(w => w.getPrivateKey().toString('hex')))
  }

  deserialize (privateKeys = []) {
    return new Promise((resolve, reject) => {
      try {
        this.wallets = privateKeys.map((privateKey) => {
          const stripped = ethUtil.stripHexPrefix(privateKey)
          const buffer = new Buffer(stripped, 'hex')
          const wallet = Wallet.fromPrivateKey(buffer)
          return wallet
        })
      } catch (e) {
        reject(e)
      }
      resolve()
    })
  }

  addAccounts (n = 1) {
    var newWallets = []
    for (var i = 0; i < n; i++) {
      newWallets.push(Wallet.generate())
    }
    this.wallets = this.wallets.concat(newWallets)
    const hexWallets = newWallets.map(w => ethUtil.bufferToHex(w.getAddress()))
    return Promise.resolve(hexWallets)
  }

  getAccounts () {
    return Promise.resolve(this.wallets.map(w => ethUtil.bufferToHex(w.getAddress())))
  }

  // tx is an instance of the ethereumjs-transaction class.
  // signTransaction (address, tx) {
  //   const wallet = this._getWalletForAccount(address)
  //   var privKey = wallet.getPrivateKey()
  //   //sign the TX with private key and 
  //   tx.sign(privKey)
  //   return Promise.resolve(tx)
  // }

/* 
 * A simple signTransaction function to sign
 * the input TX with private key.
 * Input:
 * tx - a JSON format object contains the input TX info
 * privateKey - a string format of the private key
 * Output:
 * rawTransaction - a String, can be used with 
 *                  mc.sendRawTransaction
 * 
 * 
*/
  // tx is a RAW TX, return a HEX string of signed data.
  signTransaction (address, tx) {
    const wallet = this._getWalletForAccount(address)
    var privateKey = wallet.getPrivateKey()
    //sign the TX with private key and return the signed HEX data
    // var signedTx = tx.sign(privKey)
    //Check the input fiels of the tx
        if (tx.chainId < 1) {
            return new Error('"Chain ID" is invalid');
        }

        if (!tx.gas && !tx.gasLimit) {
           return new Error('"gas" is missing');
        }

        if (tx.nonce  < 0 ||
            tx.gasLimit  < 0 ||
            tx.gasPrice  < 0 ||
            tx.chainId  < 0) {
            return new Error('Gas, gasPrice, nonce or chainId is lower than 0');
        }


        //Sharding Flag only accept the 
        //If input has not sharding flag, set it to 0 as global TX.
        if (tx.shardingFlag == undefined){
            // console.log("Set default sharding to 0");
            tx.shardingFlag = 0;
        }


        try {
            //Make sure all the number fields are in HEX format

            var transaction = tx;
            transaction.to = tx.to || '0x';//Can be zero, for contract creation
            transaction.data = tx.data || '0x';//can be zero for general TXs
            transaction.value = tx.value || '0x';//can be zero for contract call
            transaction.chainId = ethUtil.intToHex(tx.chainId);
            transaction.shardingFlag = '0x';//ethUtil.intToHex(tx.shardingFlag);
            transaction.systemContract = '0x';//System contract flag, always = 0
            transaction.via = tx.via || '0x'; //Sharding subchain address

// console.log("TX:",transaction);
// for (var property in transaction) {
//   if (transaction.hasOwnProperty(property)) {
//     // do stuff
//                 var tmp = transaction[property];//System contract flag, always = 0
//             console.log("Encode:",property," value ", tmp, " to ", ethUtil.rlp.encode(tmp));

//   }
// }

            //Encode the TX for signature
            //   type txdata struct {
            // AccountNonce uint64          `json:"nonce"    gencodec:"required"`
            // SystemContract uint64          `json:"syscnt" gencodec:"required"`
            // Price        *big.Int        `json:"gasPrice" gencodec:"required"`
            // GasLimit     *big.Int        `json:"gas"      gencodec:"required"`
            // Recipient    *common.Address `json:"to"       rlp:"nil"` // nil means contract creation
            // Amount       *big.Int        `json:"value"    gencodec:"required"`
            // Payload      []byte          `json:"input"    gencodec:"required"`
            // ShardingFlag uint64 `json:"shardingFlag" gencodec:"required"`
            // Via            *common.Address `json:"to"       rlp:"nil"`

            // // Signature values
            // V *big.Int `json:"v" gencodec:"required"`
            // R *big.Int `json:"r" gencodec:"required"`
            // S *big.Int `json:"s" gencodec:"required"`

            // var rlpEncoded = ethUtil.RLP.encode([
            //     Bytes.fromNat(transaction.nonce),
            //     Bytes.fromNat(transaction.systemContract),
            //     Bytes.fromNat(transaction.gasPrice),
            //     Bytes.fromNat(transaction.gasLimit),
            //     transaction.to.toLowerCase(),
            //     Bytes.fromNat(transaction.value),
            //     transaction.data,
            //     Bytes.fromNat(transaction.shardingFlag),
            //     transaction.via.toLowerCase(),
            //     Bytes.fromNat(transaction.chainId),
            //     "0x",
            //     "0x"]);
            var rlpEncoded = ethUtil.rlp.encode([
                transaction.nonce,
                transaction.systemContract,
                transaction.gasPrice,
                transaction.gasLimit,
                transaction.to.toLowerCase(),
                transaction.value,
                transaction.data,
                transaction.shardingFlag,
                transaction.via.toLowerCase(),
                transaction.chainId,
                "0x",
                "0x"]);


            var hash = ethUtil.keccak256(rlpEncoded);// Hash.keccak256(rlpEncoded);
            // for MOAC, keep 9 fields instead of 6
            var vPos = 9;
            //Sign the hash with the private key to produce the
            //V, R, S
            var newsign = ethUtil.ecsign(hash, privateKey);// ethUtil.stripHexPrefix(privateKey));
            // console.log("newsign r:", newsign.r);//ethUtil.bufferToHex(newsign));
            // console.log("newsign s:", newsign.s);
            // console.log("newsign v:", newsign.v);
            var rawTx = ethUtil.rlp.decode(rlpEncoded).slice(0,vPos+3);

            //Replace the V field with chainID info
            var newV = newsign.v + 8 + transaction.chainId *2;

            // Add trimLeadingZero to avoid '0x00' after makeEven
            // dont allow uneven r,s,v values
            rawTx[vPos] = ethUtil.toBuffer(newV);//ethUtil.stripZeros(ethUtil.padToEven(ethUtil.bufferToHex(newV)));
            rawTx[vPos+1] = newsign.r;//ethUtil.stripZeros(ethUtil.padToEven(ethUtil.bufferToHex(newsign.r)));
            rawTx[vPos+2] = newsign.s;//ethUtil.stripZeros(ethUtil.padToEven(ethUtil.bufferToHex(newsign.s)));


            var signedTx = ethUtil.rlp.encode(rawTx);

        } catch(e) {

            return e;
        }

    return Promise.resolve(signedTx)
    // return ethUtil.bufferToHex(signedTx) //This only return a HEX string, 
  }

  // For eth_sign, we need to sign arbitrary data:
  signMessage (withAccount, data) {
    const wallet = this._getWalletForAccount(withAccount)
    const message = ethUtil.stripHexPrefix(data)
    var privKey = wallet.getPrivateKey()
    var msgSig = ethUtil.ecsign(new Buffer(message, 'hex'), privKey)
    var rawMsgSig = ethUtil.bufferToHex(sigUtil.concatSig(msgSig.v, msgSig.r, msgSig.s))
    return Promise.resolve(rawMsgSig)
  }

  // For personal_sign, we need to prefix the message:
  signPersonalMessage (withAccount, msgHex) {
    const wallet = this._getWalletForAccount(withAccount)
    const privKey = ethUtil.stripHexPrefix(wallet.getPrivateKey())
    const privKeyBuffer = new Buffer(privKey, 'hex')
    const sig = sigUtil.personalSign(privKeyBuffer, { data: msgHex })
    return Promise.resolve(sig)
  }

  // personal_signTypedData, signs data along with the schema
  signTypedData (withAccount, typedData) {
    const wallet = this._getWalletForAccount(withAccount)
    const privKey = ethUtil.toBuffer(wallet.getPrivateKey())
    const sig = sigUtil.signTypedData(privKey, { data: typedData })
    return Promise.resolve(sig)
  }

  // exportAccount should return a hex-encoded private key:
  exportAccount (address) {
    const wallet = this._getWalletForAccount(address)
    return Promise.resolve(wallet.getPrivateKey().toString('hex'))
  }


  /* PRIVATE METHODS */

  _getWalletForAccount (account) {
    const address = sigUtil.normalize(account)
    let wallet = this.wallets.find(w => ethUtil.bufferToHex(w.getAddress()) === address)
    if (!wallet) throw new Error('Simple Keyring - Unable to find matching address.')
    return wallet
  }

  _checkRawTxFields(tx){

  }


}

MoacKeyring.type = type
module.exports = MoacKeyring
