/*global chrome*/
import './App.css';
import React, { useState, useEffect } from 'react';

function App() {
  const [age, setAge] = useState(18);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-3.5-turbo');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [job, setJob] = useState('sales');  // 初期値は空文字列やデフォルトの職種

  // Load API key from storage
  useEffect(() => {
    chrome.storage.local.get(['apiKey', 'model'], (result) => {
      if (result.apiKey) {
        setApiKey(result.apiKey);
      }
      if (result.model) {
        setModel(result.model);
      }
      if (result.job) setJob(result.job);
    });
  }, []);

  useEffect(() => {
    // On age update, send a preview update to the backend.
    simplify(false);
  }, [age]);

  const handleApiKeyChange = (e) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
    chrome.storage.local.set({ apiKey: newApiKey });
  };

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    setModel(newModel);
    chrome.storage.local.set({ model: newModel });
  };

  function simplify(commit) {
    chrome.tabs && chrome.tabs.query({
      active: true,
      currentWindow: true
    }, tabs => {
      chrome.tabs.sendMessage(
        tabs[0].id || 0,
        {
          type: 'GET_DOM',
          apiKey,
          model,
          age,
          commit,
          job,
        },
        (response) => {
          console.log("received response");
        });
    });
  }

  function simplifyAndCommit() {
    simplify(true);
  }

  return (
    <div className="App">
      <h1>Reading Tuner</h1>
      <label>
        Age:
        <input
          type="range"
          min="16"
          max="100"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />
        <div id="agediv">
          {age}
        </div>
      </label>
      <label>
        Job:
        <select value={job} onChange={(e) => setJob(e.target.value)}>
          <option value="">Select your job</option>
          <option value="student">Student</option>
          <option value="sales">Sales</option>
          <option value="engineer">Engineer</option>
          <option value="designer">Designer</option>
          <option value="hr">HR</option>
          <option value="other">Other</option>
        </select>
      </label>

      <button onClick={simplifyAndCommit}>Tune! ({model})</button>
      <div>
        <button onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? 'Hide details' : 'Details'}
        </button>
        {showAdvanced && (
          <div>
            <label>
              API Key <small>(<a href="https://platform.openai.com/api-keys">Please get an OpenAI API key if you don't have one</a>)</small>:
              <input type="password" value={apiKey} onChange={handleApiKeyChange} />
            </label>
            <label>
              Model:
              <select value={model} onChange={handleModelChange}>
                <option value="gpt-3.5-turbo">GPT-3.5 (Cheap but low quality)</option>
                <option value="gpt-4-turbo-preview">GPT-4 (Expensive but high quality)</option>
                <option value="dryrun">Dry Run (For testing)</option>
              </select>
            </label>
          </div>
        )}
      </div>
    </div >
  );
}

export default App;
