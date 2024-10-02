use anchor_lang::prelude::*;

use crate::{error::ErrorCode, EscrowAccount};

#[derive(Accounts)]
pub struct ResetGameweek<'info> {
    #[account(
        mut,
        seeds = [b"escrow"],
        bump,
        has_one = authority @ ErrorCode::NotAuthorized,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<ResetGameweek>) -> Result<()> {
    ctx.accounts.escrow_account.reset_gameweek()
}
