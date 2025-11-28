const animationStyles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      backdrop-filter: blur(0);
    }
    to {
      opacity: 1;
      backdrop-filter: blur(4px);
    }
  }

  @keyframes fadeOut {
    from {
      opacity: 1;
      backdrop-filter: blur(4px);
    }
    to {
      opacity: 0;
      backdrop-filter: blur(0);
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes popIn {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    75% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

export function injectAnimationStyles(): void {
  if (!document.head.querySelector('style[data-modal-animations]')) {
    const styleElement = document.createElement('style');
    styleElement.textContent = animationStyles;
    styleElement.setAttribute('data-modal-animations', 'true');
    document.head.appendChild(styleElement);
  }
}

export function createAnimation(name: string, duration: number = 0.3): string {
  return `${name} ${duration}s ease-out`;
}