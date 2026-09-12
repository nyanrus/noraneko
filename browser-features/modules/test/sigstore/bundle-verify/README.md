## Paremetrized verification tests

Each subdirectory is used to parametrize test_verify():
* Name of the directory is the parametrized part of test name
* Name should end in "_fail" if the verification is expected to fail
* Directory must contain
  * `bundle.sigstore.json`: The signature bundle
  * `README`: Explanation of the test: why it should fail/succeed
* Directory may optionally contain
  * `artifact`: The signed artifact. For DSSE (in-toto) envelopes, this file represents the subject of the attestation. (If not provided, "a.txt" from the parent directory is used)
  * `identity`: file contents are the signing identity (if not provided, "https://github.com/sigstore-conformance/extremely-dangerous-public-oidc-beacon/.github/workflows/extremely-dangerous-oidc-beacon.yml@refs/heads/main" is used)
  * `issuer`: file contents are the signing identity issuer (if not provided, "https://token.actions.githubusercontent.com" is used)
  * `key.pub`: The PEM-encoded public key used for verification. When this file is present, verification will be attempted with the key instead of OIDC
  * `trusted_root.json`: a custom trusted root (if one is not provided,
    the Sigstore public good production instance is used)
