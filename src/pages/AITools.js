import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';

const AITools = () => {
  const { success, error } = useNotification();
  const [selectedTool, setSelectedTool] = useState('cover');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  // Form states for different tools
  const [coverArtForm, setCoverArtForm] = useState({
    prompt: '',
    style: 'modern',
    mood: 'energetic'
  });

  const [songEnhancementForm, setSongEnhancementForm] = useState({
    file: null,
    enhanceType: 'quality',
    intensity: 'medium'
  });

  const [descriptionForm, setDescriptionForm] = useState({
    songTitle: '',
    genre: '',
    mood: '',
    keywords: ''
  });

  const [trendAnalysisForm, setTrendAnalysisForm] = useState({
    genre: '',
    region: 'global',
    timeframe: '30days'
  });

  const tools = [
    {
      id: 'cover',
      name: 'Cover Art Generator',
      icon: 'fa-image',
      description: 'Generate unique album artwork using AI'
    },
    {
      id: 'enhance',
      name: 'Song Enhancement',
      icon: 'fa-wand-magic-sparkles',
      description: 'Enhance audio quality and characteristics'
    },
    {
      id: 'description',
      name: 'Description Writer',
      icon: 'fa-pen-fancy',
      description: 'Generate professional song descriptions'
    },
    {
      id: 'trends',
      name: 'Trend Analysis',
      icon: 'fa-chart-line',
      description: 'Analyze current music trends'
    }
  ];

  const handleCoverArtGeneration = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai/generate-cover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(coverArtForm)
      });

      if (!response.ok) throw new Error('Failed to generate cover art');

      const data = await response.json();
      setResult(data);
      success('Cover art generated successfully');
    } catch (err) {
      error('Failed to generate cover art');
      console.error('Cover generation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSongEnhancement = async (e) => {
    e.preventDefault();
    if (!songEnhancementForm.file) {
      error('Please select an audio file');
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('audio', songEnhancementForm.file);
    formData.append('enhanceType', songEnhancementForm.enhanceType);
    formData.append('intensity', songEnhancementForm.intensity);

    try {
      const response = await fetch('/api/ai/enhance-song', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Failed to enhance song');

      const data = await response.json();
      setResult(data);
      success('Song enhanced successfully');
    } catch (err) {
      error('Failed to enhance song');
      console.error('Song enhancement error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDescriptionGeneration = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(descriptionForm)
      });

      if (!response.ok) throw new Error('Failed to generate description');

      const data = await response.json();
      setResult(data);
      success('Description generated successfully');
    } catch (err) {
      error('Failed to generate description');
      console.error('Description generation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTrendAnalysis = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai/analyze-trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(trendAnalysisForm)
      });

      if (!response.ok) throw new Error('Failed to analyze trends');

      const data = await response.json();
      setResult(data);
      success('Trend analysis completed');
    } catch (err) {
      error('Failed to analyze trends');
      console.error('Trend analysis error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderToolForm = () => {
    switch (selectedTool) {
      case 'cover':
        return (
          <form onSubmit={handleCoverArtGeneration} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={coverArtForm.prompt}
                onChange={(e) => setCoverArtForm(prev => ({ ...prev, prompt: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white h-32"
                placeholder="Describe your ideal cover art..."
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Style
                </label>
                <select
                  value={coverArtForm.style}
                  onChange={(e) => setCoverArtForm(prev => ({ ...prev, style: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="modern">Modern</option>
                  <option value="minimalist">Minimalist</option>
                  <option value="abstract">Abstract</option>
                  <option value="vintage">Vintage</option>
                  <option value="photographic">Photographic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mood
                </label>
                <select
                  value={coverArtForm.mood}
                  onChange={(e) => setCoverArtForm(prev => ({ ...prev, mood: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="energetic">Energetic</option>
                  <option value="calm">Calm</option>
                  <option value="dark">Dark</option>
                  <option value="happy">Happy</option>
                  <option value="melancholic">Melancholic</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors duration-200 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-magic mr-2"></i>
                  Generate Cover Art
                </>
              )}
            </button>
          </form>
        );

      case 'enhance':
        return (
          <form onSubmit={handleSongEnhancement} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Audio File
              </label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setSongEnhancementForm(prev => ({ ...prev, file: e.target.files[0] }))}
                className="w-full"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enhancement Type
                </label>
                <select
                  value={songEnhancementForm.enhanceType}
                  onChange={(e) => setSongEnhancementForm(prev => ({ ...prev, enhanceType: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="quality">Quality Improvement</option>
                  <option value="bass">Bass Boost</option>
                  <option value="clarity">Vocal Clarity</option>
                  <option value="balance">Mix Balance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Intensity
                </label>
                <select
                  value={songEnhancementForm.intensity}
                  onChange={(e) => setSongEnhancementForm(prev => ({ ...prev, intensity: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="light">Light</option>
                  <option value="medium">Medium</option>
                  <option value="strong">Strong</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors duration-200 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Enhancing...
                </>
              ) : (
                <>
                  <i className="fas fa-wand-magic-sparkles mr-2"></i>
                  Enhance Song
                </>
              )}
            </button>
          </form>
        );

      case 'description':
        return (
          <form onSubmit={handleDescriptionGeneration} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Song Title
              </label>
              <input
                type="text"
                value={descriptionForm.songTitle}
                onChange={(e) => setDescriptionForm(prev => ({ ...prev, songTitle: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Genre
                </label>
                <input
                  type="text"
                  value={descriptionForm.genre}
                  onChange={(e) => setDescriptionForm(prev => ({ ...prev, genre: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mood
                </label>
                <input
                  type="text"
                  value={descriptionForm.mood}
                  onChange={(e) => setDescriptionForm(prev => ({ ...prev, mood: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={descriptionForm.keywords}
                onChange={(e) => setDescriptionForm(prev => ({ ...prev, keywords: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="e.g., upbeat, summer, dance"
              />
            </div>
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors duration-200 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-pen-fancy mr-2"></i>
                  Generate Description
                </>
              )}
            </button>
          </form>
        );

      case 'trends':
        return (
          <form onSubmit={handleTrendAnalysis} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Genre
              </label>
              <input
                type="text"
                value={trendAnalysisForm.genre}
                onChange={(e) => setTrendAnalysisForm(prev => ({ ...prev, genre: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Region
                </label>
                <select
                  value={trendAnalysisForm.region}
                  onChange={(e) => setTrendAnalysisForm(prev => ({ ...prev, region: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="global">Global</option>
                  <option value="us">United States</option>
                  <option value="eu">Europe</option>
                  <option value="asia">Asia</option>
                  <option value="latam">Latin America</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Timeframe
                </label>
                <select
                  value={trendAnalysisForm.timeframe}
                  onChange={(e) => setTrendAnalysisForm(prev => ({ ...prev, timeframe: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                  <option value="1year">Last Year</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors duration-200 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Analyzing...
                </>
              ) : (
                <>
                  <i className="fas fa-chart-line mr-2"></i>
                  Analyze Trends
                </>
              )}
            </button>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-light dark:bg-dark pt-20 pb-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="glass rounded-2xl p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            AI Tools
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Enhance your music with our powerful AI-powered tools
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`glass p-6 rounded-xl text-left transition-all duration-200 ${
                selectedTool === tool.id
                  ? 'border-2 border-primary'
                  : 'border border-gray-200 dark:border-gray-700 hover:border-primary'
              }`}
            >
              <div className="w-12 h-12 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mb-4">
                <i className={`fas ${tool.icon} text-primary text-xl`}></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {tool.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {tool.description}
              </p>
            </button>
          ))}
        </div>

        {/* Tool Interface */}
        <div className="glass rounded-xl p-8">
          {renderToolForm()}

          {/* Results */}
          {result && (
            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Results
              </h3>
              {selectedTool === 'cover' && result.imageUrl && (
                <div className="aspect-square max-w-md mx-auto">
                  <img
                    src={result.imageUrl}
                    alt="Generated Cover Art"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              )}
              {selectedTool === 'enhance' && result.enhancedUrl && (
                <div className="space-y-4">
                  <audio controls className="w-full">
                    <source src={result.enhancedUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                  <a
                    href={result.enhancedUrl}
                    download
                    className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors duration-200"
                  >
                    <i className="fas fa-download mr-2"></i>
                    Download Enhanced Track
                  </a>
                </div>
              )}
              {selectedTool === 'description' && result.description && (
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-900 dark:text-white">
                    {result.description}
                  </p>
                </div>
              )}
              {selectedTool === 'trends' && result.trends && (
                <div className="space-y-4">
                  {result.trends.map((trend, index) => (
                    <div
                      key={index}
                      className="p-4 bg-white dark:bg-gray-700 rounded-lg"
                    >
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {trend.title}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300">
                        {trend.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AITools;
