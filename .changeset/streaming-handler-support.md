---
"onlycmd": minor
---

runtime.run()에 streaming handler 결과 지원(AsyncGenerator). Handler가 AsyncGenerator를 반환하면 RunResult에 `stream`이 설정되고, 호출 측에서 `for await`로 중간 결과 및 최종 return을 소비할 수 있습니다.
