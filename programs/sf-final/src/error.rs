use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Custom error message")]
    CustomError,
    #[msg("The account has been already initialized")]
    AlreadyInitialized,
    #[msg("Signer is not authorized to call the contract")]
    NotAuthorized,
    #[msg("User is not eligible to withdraw")]
    NotEligible,
    #[msg("Underflow")]
    Underflow,
    #[msg("Not Initialized")]
    NotInitialized,
    #[msg("Not Same Length")]
    NotSameLength,
    #[msg("User doesn't have any amount to withdraw")]
    NoAmountToWithdraw,
}
