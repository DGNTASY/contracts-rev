import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { SfFinal } from '../target/types/sf_final';
import { BN } from 'bn.js';
import {
	Account,
	createAccount,
	createMint,
	getAccount,
	getOrCreateAssociatedTokenAccount,
	mintTo,
} from '@solana/spl-token';
import { assert } from 'chai';

describe('sf-final', () => {
	// Configure the client to use the local cluster.
	anchor.setProvider(anchor.AnchorProvider.env());

	const provider = anchor.getProvider();
	const program = anchor.workspace.SfFinal as Program<SfFinal>;
	const connection = provider.connection;
	const payers = [
		anchor.web3.Keypair.generate(),
		anchor.web3.Keypair.generate(),
		anchor.web3.Keypair.generate(),
		anchor.web3.Keypair.generate(),
		anchor.web3.Keypair.generate(),
	];
	const owner = payers[0];
	const mintAuthority = anchor.web3.Keypair.generate();
	const usdc_min_bet = new BN(1 * 10 ** 6);
	const decimals = 6;

	type ProgramAddress = {
		publicKey: anchor.web3.PublicKey;
		bump: number;
	};

	const [escrow_account, escrow_account_bump] =
		anchor.web3.PublicKey.findProgramAddressSync(
			[Buffer.from('escrow')],
			program.programId,
		);
	let payers_accounts: ProgramAddress[] = [];
	let payers_token_account: anchor.web3.PublicKey[] = [];
	let escrow_token_account: Account;
	let token_mint: anchor.web3.PublicKey;

	async function initializeEscrowAccount(
		signer: anchor.web3.Keypair,
		token_mint: anchor.web3.PublicKey,
		escrow_token_account: anchor.web3.PublicKey,
		usdc_min_bet: anchor.BN,
		decimals: number,
	): Promise<string | Error> {
		try {
			const txn = await program.methods
				.initializeEscrow(
					token_mint,
					escrow_token_account,
					usdc_min_bet,
					decimals,
				)
				.accounts({
					signer: signer.publicKey,
				})
				.signers([signer])
				.rpc();

			return txn;
		} catch (error) {
			return error;
		}
	}

	function getBnPercentage(
		value: anchor.BN,
		percent: number,
	): anchor.BN | null {
		if (percent < 0 || percent > 100) {
			return null;
		}

		const bnPercent = new anchor.BN(percent);
		const bnOnehundert = new anchor.BN(100);
		return value.div(bnOnehundert).mul(bnPercent);
	}

	before('Is initialized!', async () => {
		console.log('Before each');

		for (let i = 0; i < payers.length; ++i) {
			const payer = payers[i];

			// Get airdrop sol
			const transferSig = await connection.requestAirdrop(
				payer.publicKey,
				10000000000,
			);
			const { blockhash, lastValidBlockHeight } =
				await connection.getLatestBlockhash();
			await connection.confirmTransaction({
				blockhash: blockhash,
				lastValidBlockHeight: lastValidBlockHeight,
				signature: transferSig,
			});

			const balanceInLamports = await connection.getBalance(
				payer.publicKey,
			);
			console.log(
				`Balance lamport for ${payer.publicKey}: `,
				balanceInLamports,
			);

			if (i == 0) {
				// Make mint
				token_mint = await createMint(
					connection,
					payer,
					mintAuthority.publicKey,
					null,
					decimals,
				);

				// Make escrow token account
				escrow_token_account = await getOrCreateAssociatedTokenAccount(
					connection,
					payer,
					token_mint,
					escrow_account,
					true,
				);
			}

			// Make accounts and mint some tokens
			const payer_token_account = await createAccount(
				connection,
				payer,
				token_mint,
				payer.publicKey,
			);

			await mintTo(
				connection,
				payer,
				token_mint,
				payer_token_account,
				mintAuthority,
				usdc_min_bet.toNumber() * 100,
			);

			payers_token_account.push(payer_token_account);

			const acc = await getAccount(connection, payer_token_account);
			console.log(
				`Balance usdc for ${payer.publicKey}, with usdc token account ${payer_token_account}: `,
				acc.amount,
			);
			assert.strictEqual(
				acc.amount.toString(),
				(usdc_min_bet.toNumber() * 100).toString(),
			);

			const [payer_account_address, payer_account_bump] =
				anchor.web3.PublicKey.findProgramAddressSync(
					[Buffer.from('user'), payer.publicKey.toBuffer()],
					program.programId,
				);
			payers_accounts.push({
				publicKey: payer_account_address,
				bump: payer_account_bump,
			});
		}
		console.log(`Escrow token account: ${escrow_token_account.address}`);
		console.log(`Escrow account: ${escrow_account}`);
		console.log(`Mint authority: ${mintAuthority.publicKey}`);
		console.log(`Token mint: ${token_mint}`);
		console.log();
	});

	it('Initialization', async () => {
		console.log('Initialization');

		const txn = await initializeEscrowAccount(
			owner,
			token_mint,
			escrow_token_account.address,
			usdc_min_bet,
			decimals,
		);
		assert.ok(txn);

		console.log(`Initialized escrow: ${txn}`);

		// Owner re-initializing it
		try {
			const txn = await initializeEscrowAccount(
				owner,
				token_mint,
				escrow_token_account.address,
				usdc_min_bet,
				decimals,
			);

			if (typeof txn != 'string') {
				throw txn;
			}

			assert.ok(false); // Throw error if executes
		} catch (_err) {
			// Can do additional checks
			assert.isTrue(_err != null && _err != undefined);
		}

		// Random user initializing it
		try {
			const txn = await initializeEscrowAccount(
				payers[1],
				token_mint,
				escrow_token_account.address,
				usdc_min_bet,
				decimals,
			);

			if (typeof txn != 'string') {
				throw txn;
			}

			assert.ok(false); // Throw error if executes
		} catch (_err) {
			assert.isTrue(_err != null && _err != undefined);
		}

		console.log();
	});

	it('bet', async () => {
		console.log('\nBet');

		var txn = await initializeEscrowAccount(
			owner,
			token_mint,
			escrow_token_account.address,
			usdc_min_bet,
			decimals,
		);
		assert.ok(txn);

		// Make the owner bet before initializing account
		try {
			await program.methods
				.bet()
				.accounts({
					owner: owner.publicKey, // WHY I have to add it as i sign with that account the transaction, but why type check keeps flaggin it as not needed?
					escrowAccount: escrow_account,
					escrowTokenAccount: escrow_token_account.address,
					userTokenAccount: payers_token_account[0],
				})
				.signers([owner])
				.rpc();

			assert.ok(false); // Throw error if executes
		} catch (_err) {
			assert.isTrue(_err != null && _err != undefined);
		}

		// Initialize owner
		const initTxn = await program.methods
			.initializeUser()
			.accounts({
				owner: owner.publicKey, // WHY in anchor if you sign with another account you need to pass the actual owner as the val
			})
			.signers([owner]) // WHY
			.rpc();
		assert.ok(initTxn);

		var userAcc = await program.account.userAccount.fetch(
			payers_accounts[0].publicKey,
		);
		assert.equal(userAcc.initialized, true);
		assert.equal(userAcc.isEligible, false);
		assert.equal(userAcc.payoutAmount.toNumber(), 0);
		assert.equal(userAcc.owner.toBase58(), owner.publicKey.toBase58());

		// Bet
		const betTxn = await program.methods
			.bet()
			.accounts({
				owner: owner.publicKey, // WHY in anchor if you sign with another account you need to pass the actual owner as the val
				userTokenAccount: payers_token_account[0],
				escrowTokenAccount: escrow_token_account.address,
				escrowAccount: escrow_account,
			})
			.signers([owner]) // WHY
			.rpc();
		assert.ok(betTxn);

		const acc = await getAccount(connection, payers_token_account[0]);
		console.log(
			`Balance usdc for ${owner.publicKey}, with usdc token account ${payers_token_account[0]}, after bet: `,
			acc.amount,
		);

		var escrowTokenAcc = await getAccount(
			connection,
			escrow_token_account.address,
		);
		console.log(
			`Balance usdc for escrow account, after bet: `,
			escrowTokenAcc.amount,
		);
		var escrowAcc =
			await program.account.escrowAccount.fetch(escrow_account);
		assert.equal(escrowAcc.initialized, true);
		assert.equal(escrowAcc.pot.toNumber(), usdc_min_bet.toNumber());
		assert.equal(escrowAcc.usdcBalance.toNumber(), usdc_min_bet.toNumber());

		userAcc = await program.account.userAccount.fetch(
			payers_accounts[0].publicKey,
		);
		assert.equal(userAcc.initialized, true);
		assert.equal(userAcc.isEligible, false);
		assert.equal(userAcc.payoutAmount.toNumber(), 0);
		assert.equal(userAcc.owner.toBase58(), owner.publicKey.toBase58());

		// Same to second player:

		// Initialize account
		await program.methods
			.initializeUser()
			.accounts({
				owner: payers[1].publicKey,
			})
			.signers([payers[1]])
			.rpc();
		// Bet
		await program.methods
			.bet()
			.accounts({
				owner: payers[1].publicKey,
				escrowTokenAccount: escrow_token_account.address,
				userTokenAccount: payers_token_account[1],
				// escrowAccount: escrow_account,
			})
			.signers([payers[1]])
			.rpc();

		// Check
		var escrowAcc =
			await program.account.escrowAccount.fetch(escrow_account);
		assert.equal(escrowAcc.initialized, true);
		assert.equal(escrowAcc.pot.toNumber(), 2 * usdc_min_bet.toNumber());
		assert.equal(
			escrowAcc.usdcBalance.toNumber(),
			2 * usdc_min_bet.toNumber(),
		);

		userAcc = await program.account.userAccount.fetch(
			payers_accounts[1].publicKey,
		);
		assert.equal(userAcc.initialized, true);
		assert.equal(userAcc.isEligible, false);
		assert.equal(userAcc.payoutAmount.toNumber(), 0);
		assert.equal(userAcc.owner.toBase58(), payers[1].publicKey.toBase58());

		// Twice bet should run smoothly no errore
		await program.methods
			.bet()
			.accounts({
				owner: payers[1].publicKey,
				escrowTokenAccount: escrow_token_account.address,
				userTokenAccount: payers_token_account[1],
			})
			.signers([payers[1]])
			.rpc();

		// Check
		var escrowAcc =
			await program.account.escrowAccount.fetch(escrow_account);
		assert.equal(escrowAcc.initialized, true);
		assert.equal(escrowAcc.pot.toNumber(), 3 * usdc_min_bet.toNumber());
		assert.equal(
			escrowAcc.usdcBalance.toNumber(),
			3 * usdc_min_bet.toNumber(),
		);

		userAcc = await program.account.userAccount.fetch(
			payers_accounts[1].publicKey,
		);
		assert.equal(userAcc.initialized, true);
		assert.equal(userAcc.isEligible, false);
		assert.equal(userAcc.payoutAmount.toNumber(), 0);
		assert.equal(userAcc.owner.toBase58(), payers[1].publicKey.toBase58());
	});

	it('Set Gameweek Winners', async () => {
		console.log('Set Gameweek Winners');
		var times_betted = 3;
		// Initialize all remaining users, skip first two of previous it clausle
		for (let i = 2; i < payers.length; ++i) {
			await program.methods
				.initializeUser()
				.accounts({
					owner: payers[i].publicKey, // WHY in anchor if you sign with another account you need to pass the actual owner as the val
				})
				.signers([payers[i]]) // WHY
				.rpc();
		}

		// Make users bet
		for (let i = 2; i < payers.length; ++i) {
			await program.methods
				.bet()
				.accounts({
					owner: payers[i].publicKey, // WHY in anchor if you sign with another account you need to pass the actual owner as the val
					escrowTokenAccount: escrow_token_account.address,
					userTokenAccount: payers_token_account[i],
				})
				.signers([payers[i]]) // WHY
				.rpc();

			times_betted += 1;
		}

		// Check balance escrow
		var escrowAcc =
			await program.account.escrowAccount.fetch(escrow_account);
		assert.equal(
			escrowAcc.pot.toNumber(),
			times_betted * usdc_min_bet.toNumber(),
		);
		assert.equal(
			escrowAcc.usdcBalance.toNumber(),
			times_betted * usdc_min_bet.toNumber(),
		);

		// Gameweek passes
		const feesProtocol = getBnPercentage(escrowAcc.pot, 5);
		const constpayoutAfterFees = escrowAcc.pot.sub(feesProtocol);
		const payoutFirst = getBnPercentage(constpayoutAfterFees, 70);
		const payoutSecond = getBnPercentage(constpayoutAfterFees, 25);
		const payoutThird = getBnPercentage(constpayoutAfterFees, 5);
		const results = {
			winners: [0, 1, 2, 4],
			payouts: [feesProtocol, payoutFirst, payoutSecond, payoutThird],
		};

		try {
			await program.methods
				.setEligibility(
					payers[results.winners[1]].publicKey,
					results.payouts[1],
				)
				.accounts({
					authority: payers[4].publicKey,
					userAccount: payers_accounts[1],
					escrowAccount: escrow_account,
				})
				.signers([payers[4]])
				.rpc();
			assert.isTrue(false);
		} catch (error) {
			assert.ok(error != null && error != undefined);
		}

		await program.methods
			.resetGameweek()
			.accounts({
				authority: owner.publicKey,
				escrowAccount: escrow_account,
			})
			.signers([owner])
			.rpc();

		for (let i = 0; i < results.winners.length; ++i) {
			await program.methods
				.setEligibility(
					payers[results.winners[i]].publicKey,
					results.payouts[i],
				)
				.accounts({
					authority: owner.publicKey,
					escrowAccount: escrow_account,
					user_account: payers_accounts[results.winners[i]],
				})
				.signers([owner])
				.rpc();
		}

		// Checks

		// Pot == 0
		var escrowAcc =
			await program.account.escrowAccount.fetch(escrow_account);
		assert.equal(escrowAcc.pot.toNumber(), 0, 'Escrow pot balance');
		assert.equal(
			escrowAcc.usdcBalance.toNumber(),
			times_betted * usdc_min_bet.toNumber(),
			'Usdc balance escrow',
		);

		// Users elegible and payout balance
		for (let i = 0; i < results.payouts.length; ++i) {
			var userAcc = await program.account.userAccount.fetch(
				payers_accounts[results.winners[i]].publicKey,
			);

			assert.equal(userAcc.isEligible, true);
			assert.equal(
				userAcc.payoutAmount.toNumber(),
				results.payouts[i].toNumber(),
			);
		}

		console.log();
	});

	it('Withdraw payouts', async () => {
		// Get escrow balance
		var escrowAcc =
			await program.account.escrowAccount.fetch(escrow_account);

		// Calculate payouts
		const feesProtocol = getBnPercentage(escrowAcc.pot, 5);
		const constpayoutAfterFees = escrowAcc.pot.sub(feesProtocol);
		const payoutFirst = getBnPercentage(constpayoutAfterFees, 70);
		const payoutSecond = getBnPercentage(constpayoutAfterFees, 25);
		const payoutThird = getBnPercentage(constpayoutAfterFees, 5);

		// Get users usdc balances
		const results = {
			winners: [0, 1, 2, 4],
			payouts: [feesProtocol, payoutFirst, payoutSecond, payoutThird],
			balancePreviousToPayout: [] as bigint[],
		};

		for (let i = 0; i < results.winners.length; ++i) {
			const acc = await getAccount(
				connection,
				payers_token_account[results.winners[i]],
			);
			results.balancePreviousToPayout.push(acc.amount);
		}

		// Withdraw non winner
		try {
			const signer = payers[3];
			await program.methods
				.withdraw()
				.accounts({
					owner: signer.publicKey,
					escrowTokenAccount: escrow_token_account.address,
					userTokenAccount: payers_token_account[3],
				})
				.signers([signer])
				.rpc();

			assert.isTrue(false);
		} catch (error) {}

		// Withdraw payouts
		for (let i = 0; i < results.winners.length; ++i) {
			// Withdraw
			const signer = payers[results.winners[i]];

			console.log(`Withdrawing for: ${signer.publicKey}`);

			await program.methods
				.withdraw()
				.accounts({
					owner: signer.publicKey,
					escrowTokenAccount: escrow_token_account.address,
					userTokenAccount: payers_token_account[results.winners[i]],
				})
				.signers([signer])
				.rpc();

			var userAcc = await program.account.userAccount.fetch(
				payers_accounts[results.winners[i]].publicKey,
			);

			assert.equal(userAcc.isEligible, false);
			assert.equal(userAcc.payoutAmount.toNumber(), 0);
		}

		var escrowAcc =
			await program.account.escrowAccount.fetch(escrow_account);
		assert.equal(escrowAcc.pot.toNumber(), 0);
		assert.equal(escrowAcc.usdcBalance.toNumber(), 0);

		// Try a winner after he withdraw
		try {
			const signer = payers[2];
			console.log(`Withdrawing for: ${signer.publicKey}`);

			await program.methods
				.withdraw()
				.accounts({
					owner: signer.publicKey,
					escrowTokenAccount: escrow_token_account.address,
					userTokenAccount: payers_token_account[2],
				})
				.signers([signer])
				.rpc();

			assert.isTrue(false);
		} catch (error) {}
	});
});
