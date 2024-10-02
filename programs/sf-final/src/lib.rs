pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("HN8EewTjx7wCePJYUHEHSzP1xha9UzHT8FF12X6in4q2");

#[program]
pub mod sf_final {
    use super::*;

    pub fn initialize_escrow(
        ctx: Context<EscrowInitialize>,
        usdc_mint: Pubkey,
        usdc_token_account: Pubkey,
        min_bet_amount: u64,
        decimals: u8,
    ) -> Result<()> {
        initialize_escrow::handler(ctx, usdc_mint, usdc_token_account, min_bet_amount, decimals)
    }

    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        initialize_user::handler(ctx)
    }

    pub fn bet(ctx: Context<Bet>) -> Result<()> {
        bet::handler(ctx)
    }

    pub fn reset_gameweek(ctx: Context<ResetGameweek>) -> Result<()> {
        reset_gameweek::handler(ctx)
    }

    pub fn set_eligibility(
        ctx: Context<SetEligibility>,
        user_account_pubkey: Pubkey,
        payout_amount: u64,
    ) -> Result<()> {
        set_eligibility::handler(ctx, user_account_pubkey, payout_amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        withdraw::handler(ctx)
    }
}
