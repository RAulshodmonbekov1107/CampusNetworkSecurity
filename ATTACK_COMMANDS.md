# Attack Lab Commands

Use these commands from the project root:

```bash
bash attack_lab.sh help
```

## Quick runs

Run the main safe demo set:

```bash
bash attack_lab.sh all
```

Run only failed-login style events:

```bash
bash attack_lab.sh auth
```

Run only sudo / privilege-abuse style events:

```bash
bash attack_lab.sh privilege
```

Open a temporary listener to trigger port-change detection:

```bash
bash attack_lab.sh port-open
```

Close the temporary listener:

```bash
bash attack_lab.sh port-close
```

Create suspicious files safely in `/tmp`:

```bash
bash attack_lab.sh fim-safe
```

Trigger real file-integrity monitoring by modifying `/etc/hosts`:

```bash
bash attack_lab.sh fim-real
```

Clean everything up:

```bash
bash attack_lab.sh cleanup
```

## Where to check detection

- `http://localhost:3000` -> `SIEM`
- `https://localhost:5602` -> `Security Events`
- `http://localhost:5601/app/security` -> Elastic Security alerts

## Notes

- `fim-real` may ask for `sudo`.
- `fim-safe` is good for repeatable demos, but `/tmp` may not be part of real Wazuh FIM rules.
- After running attacks, wait about 1-2 minutes before refreshing dashboards.
- If needed, filter Wazuh events by `agent.id=001` or `agent.name=campus-host`.
