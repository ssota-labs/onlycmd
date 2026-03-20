# X plugin tests

## Unit tests (no setup)

Mock `fetch`; no token or env needed.

```bash
pnpm test -- src/__tests__/x/tweet.test.ts src/__tests__/x/user.test.ts
```

## Integration tests (real X API)

Requires a Bearer token and optional env in **onlycmd repo root** `.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `X_BEARER_TOKEN` | Yes | OAuth 2.0 Bearer token (App-only for read-only; user access token if you run write test) |
| `X_TEST_USERNAME` | No | Username for user/timeline tests (default: `elonmusk`) |
| `X_INTEGRATION_WRITE` | No | Set to `1` to run the "tweet create" test (posts one real tweet) |

Run all plugin tests (unit + integration when token is set):

```bash
cd packages/plugin && pnpm test
```

Run only X integration tests (skipped when `X_BEARER_TOKEN` is missing):

```bash
cd packages/plugin && pnpm test -- src/__tests__/x/integration.x.test.ts
```

## 최대한 다 테스트 + 결과 텍스트로 보기

- **한 줄씩 텍스트로 보기** (각 테스트 이름과 통과/실패 출력):
  ```bash
  cd packages/plugin && pnpm test:verbose
  ```
- **쓰기 테스트까지 포함** (tweet create 1회 실행, 실 트윗 1개 포스트):
  ```bash
  cd packages/plugin && pnpm test:full
  ```
- **결과를 파일로 저장** (터미널 + `test-results.txt` 동시 출력):
  ```bash
  cd packages/plugin && pnpm test:report
  ```
  쓰기까지 포함해 리포트 저장하려면:
  ```bash
  X_INTEGRATION_WRITE=1 pnpm test:verbose 2>&1 | tee test-results.txt
  ```

### Getting a token

- **Read-only**: [X Developer Portal](https://developer.x.com/) → Project/App → Keys and tokens → generate **Bearer Token** (App-only).
- **Including tweet create**: Use OAuth 2.0 user access token (Authorization Code with PKCE) for your app; set that as `X_BEARER_TOKEN` and `X_INTEGRATION_WRITE=1` to run the write test.
