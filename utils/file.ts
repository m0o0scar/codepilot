export const downloadTextFile = (content: string, type: string, filename: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = filename;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
};

export const languageToFileExt = (language: string) => {
  switch (language) {
    case 'python':
      return 'py';

    case 'javascript':
      return 'js';

    case 'typescript':
      return 'ts';

    case 'rust':
      return 'rs';

    case 'py':
    case 'js':
    case 'css':
    case 'html':
    case 'dart':
    case 'diff':
      return language;

    default:
      return 'txt';
  }
};
