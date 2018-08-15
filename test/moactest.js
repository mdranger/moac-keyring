const assert = require('assert')
const ethUtil = require('ethereumjs-util')
const sigUtil = require('eth-sig-util')
const MoacKeyring = require('../')

const TYPE_STR = 'MOAC Key Pair'

// Sample account:
const testAccount = {
  key: '0xb8a9c05beeedb25df85f8d641538cbffedf67216048de9c678ee26260eb91952',
  address: '0x01560cd3bac62cc6d7e6380600d9317363400896',
}

describe('moac-keyring', () => {

  let keyring
  beforeEach(() => {
    keyring = new MoacKeyring()
  })

  describe('Keyring.type', () => {
    it('is a class property that returns the type string.', () => {
      const type = MoacKeyring.type
      assert.equal(type, TYPE_STR)
    })
  })

  describe('#type', () => {
    it('returns the correct value', () => {
      const type = keyring.type
      assert.equal(type, TYPE_STR)
    })
  })

  describe('#serialize empty wallets.', () => {
    it('serializes an empty array', async () => {
      const output = await keyring.serialize()
      assert.deepEqual(output, [])
    })
  })

  describe('#deserialize a private key', () => {
    it('serializes what it deserializes', async () => {
      await keyring.deserialize([testAccount.key])
      assert.equal(keyring.wallets.length, 1, 'has one wallet')
      const serialized = await keyring.serialize()
      assert.equal(serialized[0], ethUtil.stripHexPrefix(testAccount.key))
      const accounts = await keyring.getAccounts()
      assert.deepEqual(accounts, [testAccount.address], 'accounts match expected')
    })
  })

  describe('#constructor with a private key', () => {
    it('has the correct addresses', async () => {
      const keyring = new MoacKeyring([testAccount.key])
      const accounts = await keyring.getAccounts()
      assert.deepEqual(accounts, [testAccount.address], 'accounts match expected')
    })
  })


/*
Main test to send Raw transaction to MOAC network
txParams
from
:
"0x7312f4b8a4457a36827f185325fd6b66a3f8bb8b"
gas:
"0xcf09"
gasPrice:
"0x4a817c800"
to:
"0xb55a404b860be17fcb5623bb4dd24e904a674b44"
value:
"0xde0b6b3a7640000"
testnet101
{ from: '0x7312F4B8A4457a36827f185325Fd6B66a3f8BB8B',
  nonce: '0x6c',
  gasPrice: '0xbebc200',
  gasLimit: '0x4c4b40',
  to: '0xD814F2ac2c4cA49b33066582E4e97EBae02F2aB9',
  value: '0x115dd030eb169800',
  data: '0x00',
  chainId: '0x65',
  shardingFlag: '0x0',
  systemContract: '0x',
  via: '0x' }
"0xf8706c80840bebc200834c4b4094d814f2ac2c4ca49b33066582e4e97ebae02f2ab988115dd030eb16980000808081eea046d519de37b14774f70c6a49273f08ee0cec5b2fee84f41647b48954a50dacf6a022f2bb7d7f55b31d31ba1573a3d5cb27c36aeed3c4b605ff8ba5ad3ee216f174";
*/
  describe('#TestSignRawTX', () => {
    const address = '0x7312f4b8a4457a36827f185325fd6b66a3f8bb8b'
    const privateKey = '0xc75a5f85ef779dcf95c651612efb3c3b9a6dfafb1bb5375905454d9fc8be8a6b'
    // const privateKey = '0xb8a9c05beeedb25df85f8d641538cbffedf67216048de9c678ee26260eb91952'
    // const expectedResult = '0xf86d028504a817c80082cf0994b55a404b860be17fcb5623bb4dd24e904a674b44880de0b6b3a76400008081eca0809646128c0f0b9b8d56827cefce311fac12f822524f1d9da05d5735328c9645a06a10f3323c2cec343a4aca31299364a94fcf44c8721efc3264aab4933355d090'

    // const rawTX = {from: address,
    // nonce: '0x2', gasPrice: '0x77359400', gasLimit: '0xcf09',to: '0xb55a404b860be17fcb5623bb4dd24e904a674b44',
    // value: '0xde0b6b3a7640000',
    // data: '0x00',
    // chainId: 100 };
    const expectedResult = '0xf8706c80840bebc200834c4b4094d814f2ac2c4ca49b33066582e4e97ebae02f2ab988115dd030eb16980000808081eda056a046fc7b248357047df710c9df9693259692d78719eee215bfc9bdaeabd3e0a03c6b1987b4ee44b974a51880e5dcd5fec1a4cdae2b0abca7bc96ed34672baeed';
    const rawTX = { from: '0x7312F4B8A4457a36827f185325Fd6B66a3f8BB8B',
      nonce: '0x6c',
      gasPrice: '0xbebc200',
      gasLimit: '0x4c4b40',
      to: '0xD814F2ac2c4cA49b33066582E4e97EBae02F2aB9',
      value: '0x115dd030eb169800',
      data: '0x0',
      chainId: 101,
      shardingFlag: '0x00',
      systemContract: '0x',
      via: '0x' };

    it('get the same signed TX as Chain3', async () => {
      await keyring.deserialize([ privateKey ])
      const result = await keyring.signTransaction(address, rawTX)
      // console.log("Results:", result);
      assert.equal(ethUtil.bufferToHex(result), expectedResult)
    })


    // it('reliably can verify the TX it signs', async () => {
    //   const message = 'hello there!'
    //   const msgHashHex = ethUtil.bufferToHex(ethUtil.sha3(message))

    //   await keyring.deserialize([ privateKey ])
    //   await keyring.addAccounts(9)
    //   const addresses = await keyring.getAccounts()
    //   const signatures = await Promise.all(addresses.map(async (address) => {
    //     return await keyring.signMessage(address, msgHashHex)
    //   }))
    //   signatures.forEach((sgn, index) => {
    //     const address = addresses[index]

    //     const r = ethUtil.toBuffer(sgn.slice(0,66))
    //     const s = ethUtil.toBuffer('0x' + sgn.slice(66,130))
    //     const v = ethUtil.bufferToInt(ethUtil.toBuffer('0x' + sgn.slice(130,132)))
    //     const m = ethUtil.toBuffer(msgHashHex)
    //     const pub = ethUtil.ecrecover(m, v, r, s)
    //     const adr = '0x' + ethUtil.pubToAddress(pub).toString('hex')

    //     assert.equal(adr, address, 'recovers address from signature correctly')
    //   })
    // })
})


})
