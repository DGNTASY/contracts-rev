use anchor_lang::prelude::*;

use crate::state::user::UserAccount;

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(
        init,
        seeds = [b"user", owner.key().as_ref()],
        bump,
        payer = owner,
        space = 8 + 48 * 2,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeUser>) -> Result<()> {
    msg!("Initializing User");

    return ctx
        .accounts
        .user_account
        .init(ctx.accounts.owner.key(), ctx.bumps.user_account);
}
