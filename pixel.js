(function() {
  const queue = window.pier39.q || [];
  const state = {};

  function sendToServer(endpoint, payload) {
    fetch('https://dev.personapay.tech/advertisers/campaign/' + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  }

  function handleCommand(cmd, ...args) {
    if (cmd === 'init') {
      const [advertiserId] = args;
      state.advertiserId = advertiserId;
    }

    if (cmd === 'track') {
      const [eventName, eventData] = args;
      const payload = {
        event: eventName,
        advertiser_id: state.advertiserId,
        url: window.location.href,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        ...eventData
      };
      sendToServer('conversion/webhook', payload);
    }
  }

  for (const item of queue) {
    handleCommand(...item);
  }

  window.pier39 = handleCommand;
})();
