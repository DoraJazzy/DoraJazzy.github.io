# Audio-visual synchrony perception and ADHD — experiment

A browser-based audiovisual temporal-order task. Participants see a shape and hear a tone separated by a stimulus-onset asynchrony, then judge whether the two events occurred together or with a delay.

Built for an exam project on the Perception and Action course, BSc Cognitive Science, Aarhus University.

**Live:** [dorajazzy.github.io](https://dorajazzy.github.io/)
**Analysis:** the R pipeline for the data this collects is in [DoraJazzy/Temporal-binding-in-the-ADHD-mind](https://github.com/DoraJazzy/Temporal-binding-in-the-ADHD-mind).

## Session flow

Six screens, one at a time, with no way back:

1. **Consent** — GDPR consent covering processing, storage, disclosure, access, rectification, revocation and complaints
2. **Demographics** — age and gender
3. **ASRS-v1.1** — the 18-item Adult ADHD Self-Report Scale, rated 1 (Never) to 5 (Always) over the past six months
4. **Instructions**
5. **20 trials**
6. **Completion** — accuracy summary, and the point at which all data is transmitted

## Trial structure

```
fixation cross (1000 ms) → stimulus pair → 500 ms → 500 ms → response
```

The two stimuli are a tone and an image, presented with one of 20 SOAs spanning −300 to +300 ms:

```
±10, ±30, ±50, ±75, ±100, ±125, ±150, ±200, ±250, ±300
```

Negative means the beep leads, positive means the image leads. The sign is read off the SOA and the absolute value becomes the `setTimeout` delay for whichever stimulus comes second. Trial order is shuffled per participant.

The tone is generated with the Web Audio API rather than played from a file — an 800 Hz sine oscillator with an exponential gain ramp over 100 ms — which avoids the load and decode latency an `<audio>` element would introduce.

Participants answer **Together** or **Delay**.

## What gets recorded

Per trial: the SOA, its absolute delay, which stimulus led, the response, correctness, reaction time from the appearance of the response buttons, the final mouse coordinates, and the **complete mouse trajectory** — every `mousemove` as `{x, y, timestamp}` relative to response onset.

The trajectory is the reason the task is mouse-driven rather than keyboard-driven. It records not just what was chosen but how the choice unfolded, including hesitation and changes of direction.

Nothing is sent until the end. The whole session accumulates in memory and is posted as a single JSON payload to `POST /api/submit-batch`:

```json
{
  "participant":   { "participantId": "...", "age": 0, "gender": "..." },
  "questionnaire": [ 18 integers ],
  "trials":        [ { ...per-trial record with mouseTracking array... } ]
}
```

Participant IDs are generated client-side as `P-<timestamp>-<random>`, so no identifying information is collected.

## Configuration

The API base URL lives in `config.js`:

```js
const API_BASE_URL = 'https://experimentapi.alterlily.com'
```

Set it to `http://localhost:3000` for local development. The backend is a separate service — see Credits.

## Running locally

Any static file server works, but it must be a server rather than opening `index.html` directly, or the Web Audio context and `fetch` will misbehave:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

Deployment is GitHub Pages from the default branch. All paths are relative.

## Known issues

- **Failed submissions are silent.** If the `fetch` in `sendBatchData()` rejects, the error is logged to the console and the participant still sees the completion screen. A session lost to a network blip looks identical to a successful one from the participant's side and from the researcher's.
- **Timing is not frame-locked.** `setTimeout` and CSS opacity transitions are subject to the browser's rendering loop, so the nominal SOA is approximate — worse at the short end, where a 10 ms asynchrony is well under one frame at 60 Hz.
- **No device or audio check.** The task assumes a mouse and working sound. Participants completing it on a phone produced flat zero reaction times and had to be excluded during analysis; a check at the start would have caught this before they spent ten minutes on it.
- **`_config.yml` still holds placeholder text** (`title: Experiment`, `description: Some desc`).

## Ethics and data

Participants consent before any data is collected, and the consent screen states the purpose, storage and disclosure terms, their access and rectification rights, how to withdraw, and how to complain to the Danish Data Protection Agency. No directly identifying data is recorded. Responses from participants under 18 were excluded at the analysis stage.

The ASRS-v1.1 is a World Health Organization instrument; it is reproduced here for research use and is not my own work.

## Credits

- Front end, task logic and client-side data handling — (https://github.com/DoraJazzy)
- Backend API — (https://github.com/TheHeliPilot)
