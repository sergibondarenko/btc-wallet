const BtcWallet = require('../lib/wallet')

const wallet = new BtcWallet({
  testnet: true
});

(async () => {
  try {
    const mnemonics = [
      'actress bus drop lion labor genre mirror disagree bundle advance car wisdom',
      'actress bus drop lion labor genre mirror disagree bundle advance bike wisdom'
    ]

    console.log('---------------------')
    console.log('STEP 1. Create addresses')
    mnemonics.forEach((mnemonic, i) => {
      console.log(`addr #${i}: `, wallet.create({ mnemonic }))
    })

    console.log('---------------------')
    console.log('STEP 2. Check balance')
    for (let i = 0; i < wallet.addresses.length; i++) {
      const info = await wallet.info({ address: wallet.addresses[i].pub })
      console.log(`address ${wallet.addresses[i].pub}:\n`, info)
    }

    console.log('---------------------')
    console.log('STEP 3. Send coins')
    const resp = await wallet.sendCoins({
      fromAddr: wallet.addresses[0].pub,
      wif: wallet.addresses[0].wif,
      toAddr: wallet.addresses[1].pub,
      amount: 20000, // satoshi
      fee: 0
    })

    console.log('---------------------')
    console.log('RESULT:\n', JSON.stringify(resp, null, 2))

    console.log('---------------------')
    console.log('STEP 4. Check balance')
    for (let i = 0; i < wallet.addresses.length; i++) {
      const info = await wallet.info({ address: wallet.addresses[i].pub })
      console.log(`address ${wallet.addresses[i].pub}:\n`, info)
    }
  } catch (err) {
    console.error(err)
  }
})()
