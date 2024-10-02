use anchor_lang::prelude::*;

use crate::error::ErrorCode;

#[account]
pub struct EscrowAccount {
    pub authority: Pubkey,
    pub usdc_mint: Pubkey,
    pub usdc_token_account: Pubkey,
    pub min_bet_amount: u64,
    pub pot: u128,
    pub usdc_balance: u128,
    pub decimals: u8,
    pub bump: u8,
    pub initialized: bool,
}

impl EscrowAccount {
    pub fn is_initialized(&self) -> bool {
        return self.initialized;
    }

    pub fn is_owner(&self, caller: Pubkey) -> bool {
        return self.authority == caller;
    }

    pub fn init(
        &mut self,
        authority: Pubkey,
        usdc_mint: Pubkey,
        usdc_token_account: Pubkey,
        min_bet_amount: u64,
        decimals: u8,
        bump: u8,
    ) -> Result<()> {
        // Check
        require!(!self.is_initialized(), ErrorCode::AlreadyInitialized);

        // Initialize
        self.authority = authority;
        self.usdc_mint = usdc_mint;
        self.usdc_token_account = usdc_token_account;
        self.min_bet_amount = min_bet_amount;
        self.decimals = decimals;
        self.pot = 0;
        self.usdc_balance = 0;
        self.bump = bump;
        self.initialized = true;

        Ok(())
    }

    pub fn reset_gameweek(&mut self) -> Result<()> {
        self.pot = 0;
        Ok(())
    }
}
