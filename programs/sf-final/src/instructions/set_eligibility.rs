use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::{state::UserAccount, EscrowAccount};

#[derive(Accounts)]
#[instruction(
    user_account_pubkey: Pubkey,
)]
pub struct SetEligibility<'info> {
    #[account(
        mut,
        seeds = [b"user", user_account_pubkey.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        mut,
        seeds = [b"escrow"],
        bump,
        has_one = authority @ ErrorCode::NotAuthorized,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<SetEligibility>,
    _user_account_pubkey: Pubkey,
    payout_amount: u64,
) -> Result<()> {
    msg!("Setting eligibility");

    return ctx.accounts.user_account.add_payout(payout_amount);
}
