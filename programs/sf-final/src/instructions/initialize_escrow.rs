use crate::state::escrow::EscrowAccount;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(
    usdc_mint: Pubkey,
    usdc_token_account: Pubkey,
    min_bet_amount: u64,
    decimals: u8,
)]
pub struct EscrowInitialize<'info> {
    #[account(
        init,
        seeds = [b"escrow"],
        bump,
        payer = signer,
        space = 8 + 160 * 2,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<EscrowInitialize>,
    usdc_mint: Pubkey,
    usdc_token_account: Pubkey,
    min_bet_amount: u64,
    decimals: u8,
) -> Result<()> {
    msg!("Initializing");

    return ctx.accounts.escrow_account.init(
        ctx.accounts.signer.key.key(),
        usdc_mint,
        usdc_token_account,
        min_bet_amount,
        decimals,
        ctx.bumps.escrow_account,
    );
}
