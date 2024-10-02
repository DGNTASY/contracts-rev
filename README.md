# SL contr

eliminate account

```sh
solana program close <address> --bypass warning
```

to change sol chain target:

```sh
solana config set --url <devnet | localhost>
```

to change anchor program id:

```sh
cargo clean
anchor build # first to generate id
# then change the address in lib.rs, at declare_is!("..address..")
# then change the address in Anchor.toml, at [programs.localnet]
anchor keys list
anchor build # second to update id
```
