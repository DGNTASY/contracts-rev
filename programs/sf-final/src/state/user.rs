use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Token, TokenAccount, Transfer};

use crate::error::ErrorCode;

use super::EscrowAccount;

#[account]
pub struct UserAccount {
    pub owner: Pubkey,
    pub is_eligible: bool,
    pub payout_amount: u64,
    pub bump: u8,
    pub initialized: bool,
}

impl UserAccount {
    pub fn is_initialized(&self) -> bool {
        return self.initialized;
    }

    fn is_eligible(&self) -> bool {
        return self.is_eligible;
    }

    pub fn init(&mut self, owner: Pubkey, bump: u8) -> Result<()> {
        require!(!self.is_initialized(), ErrorCode::AlreadyInitialized);

        self.owner = owner;
        self.is_eligible = false;
        self.payout_amount = 0;
        self.bump = bump;
        self.initialized = true;

        Ok(())
    }

    pub fn add_payout(&mut self, payout_amount: u64) -> Result<()> {
        require!(self.is_initialized(), ErrorCode::NotInitialized);

        self.is_eligible = true;
        self.payout_amount += payout_amount;

        Ok(())
    }

    pub fn bet<'info>(
        &mut self,
        escrow_account: &mut EscrowAccount,
        owner: Signer<'info>,
        escrow_token_account: Account<'info, TokenAccount>,
        user_token_account: Account<'info, TokenAccount>,
        token_program: Program<'info, Token>,
    ) -> Result<()> {
        require!(
            escrow_account.usdc_token_account == *escrow_token_account.to_account_info().key,
            ErrorCode::NotEligible
        );

        escrow_account.pot += escrow_account.min_bet_amount as u128;
        escrow_account.usdc_balance += escrow_account.min_bet_amount as u128;

        let transfer_instruction = Transfer {
            from: user_token_account.to_account_info(),
            to: escrow_token_account.to_account_info(),
            authority: owner.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(token_program.to_account_info(), transfer_instruction);

        return transfer(cpi_ctx, escrow_account.min_bet_amount);
    }

    pub fn withdraw<'info>(
        &mut self,
        escrow: &mut Account<'info, EscrowAccount>,
        escrow_token_account: Account<'info, TokenAccount>,
        user_token_account: Account<'info, TokenAccount>,
        token_program: Program<'info, Token>,
    ) -> Result<()> {
        require!(self.is_eligible(), ErrorCode::NotEligible);

        // User balance
        let amount = self.payout_amount;
        self.payout_amount = 0;
        self.is_eligible = false;

        require!(amount > 0, ErrorCode::NoAmountToWithdraw);

        // Escrow balance
        let remaining_escrow_balance = match escrow.usdc_balance.checked_sub(amount as u128) {
            Some(el) => el,
            None => {
                return err!(ErrorCode::Underflow);
            }
        };
        escrow.usdc_balance = remaining_escrow_balance;

        // Make Transfer
        let transfer_instruction = Transfer {
            from: escrow_token_account.to_account_info(),
            to: user_token_account.to_account_info(),
            authority: escrow.to_account_info(),
        };

        let seeds = &["escrow".as_bytes(), &escrow.bump.to_le_bytes()];
        let signer_seeds = &[seeds.as_slice()];

        transfer(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                transfer_instruction,
                signer_seeds,
            ),
            amount,
        )?;

        Ok(())
    }
}
