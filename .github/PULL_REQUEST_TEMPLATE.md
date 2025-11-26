# What's this PR for?

[Short description of change here. If there's a Trello card and/or write-up,
link them here too.]

# What could this PR break and how are you going to ensure that those things do not break?

[Think about what this PR could possibly break, and list your thoughts here. Be
sure to factor this into the testing plan below too, to ensure you're mitigating
against all known risks.]

# What's the testing plan?

[Detailed description of testing steps and test cases here. This should be in an
easy-to-follow checklist format, and should include any pre-test steps (i.e.,
data setup). If steps are missing, the PR _will_ be rejected. The reviewer is
expected to check off each item as they complete it.]

# Risk Assessment

- Probability of failure:
  - [ ] High
  - [ ] Low
- Impact:
  - [ ] High
  - [ ] Low
- Complexity:
  - [ ] High
  - [ ] Low

If any of the above are marked as high please include the below in your change
log message:

```
This change has higher risk than usual, please take some time to test out the feature.
```

# Any environment variables to add?

- **[name]:** [description]

# Any migrations to run?

- **[name]:** [description]

# Any other dependencies for go-live?

- **[dependency]:** [description]

# Any documentation changes that need to be made?

- **[section]:** [description]

# Author checklist

- [ ] Have you assigned a reviewer and notified them?
- [ ] Have you handled all errors and edge cases? This includes proper
      `try/catch` blocks, and user-friendly error messages.
- [ ] Have you added sufficient logging? This includes Slack messaging for
      critical events, and `console.debug`'s for useful debugging information.
- [ ] Have you written at least 1 test case for this code (if applicable)?
- [ ] Have you created all relevant seed data for testing?

# Reviewer checklist

- [ ] The PR description adequately describes what this PR does and what it is
      for.
- [ ] All risks associated with these changes have been adequately identified
      and explained in the description.
- [ ] All risks associated with these changes have been adequately covered by
      either the testing plan, or code tests.
- [ ] All PR comments have been explicitly acknowledged and resolved.

# Post merge checklist

- [ ] Testing plan executed in staging
- [ ] Staging logs and slack channels reviewed
- [ ] Testing plan executed in production
- [ ] Production logs and slack channels reviewed
- [ ] #deployment-pipeline green ticked
- [ ] #changelog message posted
- [ ] I am hereby comfortable that this deployment is successfully completed
