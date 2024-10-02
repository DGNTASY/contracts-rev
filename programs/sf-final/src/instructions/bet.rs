use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::{state::UserAccount, EscrowAccount};

#[derive(Accounts)]
pub struct Bet<'info> {
    #[account(
        mut,
        seeds = [b"user", owner.key().as_ref()],
        bump,
        has_one = owner,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        mut,
        seeds = [b"escrow"],
        bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Bet>) -> Result<()> {
    msg!("Betting");

    return ctx.accounts.user_account.bet(
        &mut ctx.accounts.escrow_account,
        ctx.accounts.owner.clone(),
        ctx.accounts.escrow_token_account.clone(),
        ctx.accounts.user_token_account.clone(),
        ctx.accounts.token_program.clone(),
    );
}
