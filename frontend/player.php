<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ELI6 MOVIES - Player</title>
    <link rel="icon" href="favicon.ico">
    <!-- <link href="https://fonts.cdnfonts.com/css/netflix-sans" rel="stylesheet"> -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
    <link rel="stylesheet" href="css/theme.css">
    <script src="js/i18n.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            background: #000;
            color: #fff;
            overflow-x: hidden;
            line-height: 1.4;
        }

        /* Netflix Navbar */
        .navbar {
            position: fixed;
            top: 0;
            width: 100%;
            height: 68px;
            padding: 0 60px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, transparent 100%);
            z-index: 1000;
            transition: background-color 0.4s;
        }

        .navbar.scrolled {
            background: #000;
        }

        .logo {
            color: #e50914;
            font-size: 25px;
            font-weight: 700;
            text-decoration: none;
            letter-spacing: -0.5px;
        }

        .nav-links {
            display: flex;
            gap: 20px;
            margin-left: 40px;
        }

        .nav-links a {
            color: #e5e5e5;
            text-decoration: none;
            font-size: 14px;
            font-weight: 400;
            transition: color 0.4s;
        }

        .nav-links a:hover {
            color: #b3b3b3;
        }

        .nav-right {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .nav-icon {
            color: #fff;
            text-decoration: none;
            font-size: 20px;
            transition: transform 0.2s;
        }

        .nav-icon:hover {
            transform: scale(1.1);
        }

        /* Netflix Hero Section */
        .hero-section {
            position: relative;
            min-height: 400px;
            padding-top: 80px;
            background: transparent;
            display: block;
            overflow: visible;
            margin-bottom: 0;
        }

        .hero-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            background-size: cover;
            background-position: center top;
            background-repeat: no-repeat;
            filter: brightness(0.75);
            z-index: 1;
        }

        .hero-backdrop::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(77deg,
                    rgba(0, 0, 0, 0.3) 0,
                    rgba(0, 0, 0, 0) 85%);
        }

        .hero-backdrop::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(180deg,
                    transparent 0,
                    rgba(0, 0, 0, 0.1) 10%,
                    rgba(0, 0, 0, 0.2) 20%,
                    rgba(0, 0, 0, 0.3) 30%,
                    rgba(0, 0, 0, 0.4) 40%,
                    rgba(0, 0, 0, 0.5) 50%,
                    rgba(0, 0, 0, 0.6) 60%,
                    rgba(0, 0, 0, 0.7) 70%,
                    rgba(0, 0, 0, 0.8) 80%,
                    rgba(0, 0, 0, 0.85) 85%,
                    rgba(0, 0, 0, 0.9) 90%,
                    rgba(0, 0, 0, 0.95) 95%,
                    #000 100%);
        }

        .hero-content {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 1200px;
            padding: 0 60px;
            margin-top: 0;
            margin-bottom: 0;
            margin-left: auto;
            margin-right: auto;
        }

        .video-title {
            max-width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            position: relative;
            top: 0;
            font-size: 3rem;
            font-weight: 900;
            color: #fff;
            margin-bottom: 12px;
            margin-left: 0;
            letter-spacing: -1px;
            text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.7);
            z-index: 1100;
            display: block;
        }

        .video-title-scroll {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            max-width: 100%;
        }

        .server-indicator {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #222;
            color: #fff;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 13px;
            z-index: 2000;
            opacity: 0.85;
        }

        @media (max-width: 600px) {
            .video-title {
                font-size: 1.5rem;
            }

            .server-indicator {
                font-size: 11px;
                top: 4px;
                right: 4px;
            }
        }

        .server-switch-modal {
            display: none;
            position: fixed;
            z-index: 99999;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.7);
            align-items: center;
            justify-content: center;
        }

        .server-switch-modal.active {
            display: flex;
        }

        .server-switch-modal-content {
            background: #181818;
            color: #fff;
            border-radius: 12px;
            padding: 32px 20px 24px 20px;
            max-width: 350px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }

        .server-switch-modal-content button {
            margin: 8px 4px 0 4px;
            padding: 8px 16px;
            border-radius: 4px;
            border: none;
            background: #e50914;
            color: #fff;
            font-size: 15px;
            cursor: pointer;
        }

        .server-switch-modal-content .server-btn-manual {
            background: #444;
            color: #fff;
        }

        .server-switch-modal-content .server-btn-manual.active {
            background: #e50914;
        }

        .server-switch-modal-content .report-btn {
            background: #fff;
            color: #e50914;
            margin-top: 16px;
        }

        @media (max-width: 600px) {
            .server-switch-modal-content {
                max-width: 90vw;
                padding: 18px 4vw 16px 4vw;
            }
        }

        .hero-meta {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 16px;
            font-size: 16px;
            color: #46d369;
            font-weight: 400;
        }

        .hero-rating {
            color: #46d369;
        }

        .hero-year {
            color: #999;
        }

        .hero-duration {
            color: #999;
        }

        .hero-description {
            font-size: 18px;
            line-height: 1.4;
            color: #e5e5e5;
            margin-bottom: 20px;
            max-width: 600px;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }

        .hero-actions {
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
        }

        .server-selector {
            display: flex;
            gap: 8px;
            margin-left: 20px;
        }

        .server-btn {
            background: rgba(109, 109, 110, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.5);
            color: #fff;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .server-btn.active {
            background: #e50914;
            border-color: #e50914;
        }

        .server-btn:hover {
            background: rgba(109, 109, 110, 0.4);
        }

        .server-btn.active:hover {
            background: rgba(229, 9, 20, 0.8);
        }

        .netflix-btn {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 32px;
            border: none;
            border-radius: 6px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-decoration: none;
            min-height: 52px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            position: relative;
            overflow: hidden;
        }

        .netflix-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s;
        }

        .netflix-btn:hover::before {
            left: 100%;
        }

        .btn-play {
            background: linear-gradient(135deg, #e50914 0%, #b81d24 100%);
            color: #fff;
            border: 2px solid #e50914;
            box-shadow: 0 6px 20px rgba(229, 9, 20, 0.4);
        }

        .btn-play:hover {
            background: linear-gradient(135deg, #b81d24 0%, #e50914 100%);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(229, 9, 20, 0.6);
        }

        .btn-play:active {
            transform: translateY(0);
            box-shadow: 0 4px 15px rgba(229, 9, 20, 0.5);
        }

        .btn-play i {
            font-size: 24px;
            margin-right: 4px;
        }

        .btn-more {
            background: rgba(20, 20, 20, 0.8);
            color: #fff;
            border: 2px solid rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
        }

        .btn-more:hover {
            background: rgba(40, 40, 40, 0.9);
            border-color: rgba(255, 255, 255, 0.5);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
        }

        .btn-more:active {
            transform: translateY(0);
        }

        .btn-more i {
            font-size: 22px;
            margin-right: 4px;
        }

        .btn-mylist {
            background: rgba(20, 20, 20, 0.8);
            color: #fff;
            border: 2px solid rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
        }

        .btn-mylist:hover {
            background: rgba(40, 40, 40, 0.9);
            border-color: rgba(255, 255, 255, 0.5);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
        }

        .btn-mylist:active {
            transform: translateY(0);
        }

        .btn-mylist.in-list {
            background: linear-gradient(135deg, #e50914 0%, #b81d24 100%);
            border-color: #e50914;
            box-shadow: 0 6px 20px rgba(229, 9, 20, 0.4);
        }

        .btn-mylist.in-list:hover {
            background: linear-gradient(135deg, #b81d24 0%, #e50914 100%);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(229, 9, 20, 0.6);
        }

        .btn-mylist.in-list:active {
            transform: translateY(0);
            box-shadow: 0 4px 15px rgba(229, 9, 20, 0.5);
        }

        .btn-mylist i {
            font-size: 22px;
            margin-right: 4px;
        }

        /* Netflix Video Player */
        .video-section {
            position: relative;
            width: 100%;
            max-width: 1200px;
            height: 70vh;
            margin: 0 auto;
            margin-top: 0 !important;
            background: #000;
            border-radius: 0;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            z-index: 100;
            display: block;
        }

        .video-section.fullscreen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            max-width: none;
            border-radius: 0;
            z-index: 9999;
        }

        .video-player {
            width: 100%;
            height: 100%;
            position: relative;
        }

        .video-iframe {
            width: 100%;
            height: 100%;
            border: none;
            background: #000;
        }

        .player-loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #fff;
            font-size: 18px;
            text-align: center;
        }

        .player-error {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #e50914;
            font-size: 18px;
            text-align: center;
            padding: 40px;
            background: rgba(0, 0, 0, 0.9);
            border-radius: 8px;
            max-width: 500px;
        }

        /* Netflix Content Details */
        .content-section {
            position: relative;
            padding: 10px 60px 60px 60px;
            background: transparent;
            z-index: 2;
        }

        /* Netflix Tabs */
        .content-tabs {
            display: flex;
            gap: 40px;
            margin-bottom: 30px;
            border-bottom: 1px solid #333;
        }

        .tab-button {
            background: none;
            border: none;
            color: #999;
            font-size: 16px;
            font-weight: 500;
            padding: 12px 0;
            cursor: pointer;
            transition: color 0.2s;
            border-bottom: 2px solid transparent;
        }

        .tab-button.active {
            color: #fff;
            border-bottom-color: #fff;
        }

        .tab-button:hover {
            color: #fff;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        /* Expanded Overview Styles */
        .overview-content {
            max-width: 1200px;
            margin: 0 auto;
        }

        .overview-main {
            margin-bottom: 40px;
        }

        .overview-title {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 20px;
            color: #fff;
            line-height: 1.2;
        }

        .overview-text {
            font-size: 20px;
            line-height: 1.7;
            color: #e5e5e5;
            margin-bottom: 20px;
            max-width: 900px;
        }

        .overview-tagline {
            font-size: 18px;
            font-style: italic;
            color: #999;
            margin-bottom: 20px;
            font-weight: 400;
        }

        .overview-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
        }

        .detail-section {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 8px;
            padding: 24px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .detail-section h3 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #fff;
            border-bottom: 1px solid #333;
            padding-bottom: 12px;
        }

        .detail-grid {
            display: grid;
            gap: 16px;
        }

        .detail-item {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .detail-item:last-child {
            border-bottom: none;
        }

        .detail-label {
            font-size: 16px;
            font-weight: 500;
            color: #999;
            min-width: 120px;
        }

        .detail-value {
            font-size: 16px;
            font-weight: 400;
            color: #fff;
            text-align: right;
            flex: 1;
            margin-left: 20px;
        }

        .rating-value {
            color: #46d369;
            font-weight: 600;
        }

        .companies-list,
        .languages-list {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }

        .company-tag,
        .language-tag {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 400;
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.2s;
        }

        .company-tag:hover,
        .language-tag:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-1px);
        }

        /* Netflix Trailers */
        .trailer-section h2 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 24px;
            color: #fff;
        }

        .trailer-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 24px;
        }

        .trailer-item {
            background: #141414;
            border-radius: 8px;
            overflow: hidden;
            transition: transform 0.2s;
        }

        .trailer-item:hover {
            transform: scale(1.02);
        }

        .trailer-placeholder {
            cursor: pointer;
        }

        .trailer-thumbnail {
            position: relative;
            width: 100%;
            height: 225px;
            overflow: hidden;
        }

        .trailer-thumbnail img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.2s;
        }

        .trailer-placeholder:hover .trailer-thumbnail img {
            transform: scale(1.05);
        }

        .trailer-type-badge {
            position: absolute;
            top: 12px;
            right: 12px;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .play-overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            background: rgba(0, 0, 0, 0.8);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .play-overlay i {
            color: #fff;
            font-size: 30px;
            margin-left: 4px;
        }

        .trailer-placeholder:hover .play-overlay {
            background: rgba(229, 9, 20, 0.9);
            transform: translate(-50%, -50%) scale(1.1);
        }

        .trailer-video {
            width: 100%;
            height: 225px;
            border: none;
        }

        .trailer-info {
            padding: 16px;
        }

        .trailer-title {
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 8px;
            color: #fff;
        }

        .trailer-description {
            color: #999;
            font-size: 14px;
        }

        .trailer-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 225px;
            padding: 20px;
            text-align: center;
        }

        .trailer-error .error-text {
            margin-bottom: 16px;
        }

        /* Netflix Cast */
        .cast-section h2 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 24px;
            color: #fff;
        }

        .cast-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 24px;
        }

        .cast-item {
            background: #141414;
            border-radius: 8px;
            overflow: hidden;
            transition: transform 0.2s;
        }

        .cast-item:hover {
            transform: scale(1.02);
        }

        .cast-photo {
            width: 100%;
            height: 300px;
            object-fit: cover;
        }

        .cast-info {
            padding: 16px;
        }

        .cast-name {
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 4px;
            color: #fff;
        }

        .cast-character {
            color: #999;
            font-size: 14px;
        }

        /* Netflix Similar */
        .similar-section h2 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 24px;
            color: #fff;
        }

        .similar-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 24px;
        }

        .similar-item {
            background: #141414;
            border-radius: 8px;
            overflow: hidden;
            transition: transform 0.2s;
            cursor: pointer;
        }

        .similar-item:hover {
            transform: scale(1.02);
        }

        .similar-poster {
            width: 100%;
            height: 300px;
            object-fit: cover;
        }

        .similar-info {
            padding: 16px;
        }

        .similar-title {
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 4px;
            color: #fff;
        }

        .similar-meta {
            color: #999;
            font-size: 14px;
        }

        /* Netflix Episodes */
        .episode-section h2 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 24px;
            color: #fff;
        }

        .season-selector {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }

        .season-button {
            background: #333;
            border: none;
            color: #fff;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s;
            font-size: 14px;
        }

        .season-button.active {
            background: #fff;
            color: #000;
        }

        .season-button:hover {
            background: #555;
        }

        .season-button.active:hover {
            background: #e5e5e5;
        }

        .episodes-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 24px;
        }

        .episode-item {
            background: #141414;
            border-radius: 8px;
            overflow: hidden;
            transition: transform 0.2s;
            cursor: pointer;
        }

        .episode-item:hover {
            transform: scale(1.02);
        }

        .episode-still {
            width: 100%;
            height: 169px;
            object-fit: cover;
        }

        .episode-info {
            padding: 16px;
        }

        .episode-number {
            font-size: 14px;
            color: #46d369;
            font-weight: 500;
            margin-bottom: 8px;
        }

        .episode-title {
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 8px;
            color: #fff;
        }

        .episode-meta {
            display: flex;
            gap: 12px;
            margin-bottom: 8px;
            font-size: 14px;
            color: #999;
        }

        .episode-overview {
            color: #999;
            font-size: 14px;
            line-height: 1.4;
        }

        /* Netflix Responsive */
        @media (max-width: 768px) {
            .navbar {
                padding: 0 20px;
                height: 60px;
            }

            .nav-links {
                display: none;
            }

            .hero-content {
                padding: 0 20px;
                margin-top: -50px;
            }

            .hero-title {
                font-size: 2rem;
                margin-bottom: 10px;
                margin-left: 0;
            }

            .hero-description {
                font-size: 16px;
            }

            .content-section {
                padding: 40px 20px;
            }

            .trailer-grid {
                grid-template-columns: 1fr;
            }

            .cast-grid {
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            }

            .similar-grid {
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            }
        }

        /* Hide scrollbars */
        * {
            scrollbar-width: none;
            -ms-overflow-style: none;
        }

        *::-webkit-scrollbar {
            display: none;
        }

        /* Netflix Loading States */
        .loading-text {
            color: #999;
            font-size: 16px;
            text-align: center;
            padding: 40px;
        }

        /* Netflix Error States */
        .error-text {
            color: #e50914;
            font-size: 16px;
            text-align: center;
            padding: 40px;
        }

        /* Episode Selector Styles */
        .episode-selector {
            display: flex;
            gap: 20px;
            margin-left: 20px;
            align-items: center;
        }

        .selector-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .selector-group label {
            color: #fff;
            font-size: 14px;
            font-weight: 500;
        }

        .selector-group select {
            background: rgba(109, 109, 110, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.5);
            color: #fff;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            min-width: 80px;
        }

        .selector-group select:hover {
            background: rgba(109, 109, 110, 0.4);
        }

        .selector-group select:focus {
            outline: none;
            border-color: #e50914;
            background: rgba(109, 109, 110, 0.9);
        }

        .selector-group select option {
            background: #2a2a2a;
            color: #fff;
        }

        /* Server Error Modal Styles */
        #serverErrorModal {
            display: none;
            position: fixed;
            z-index: 99999;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.7);
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
            }

            to {
                opacity: 1;
            }
        }

        .main-title {
            width: 100%;
            text-align: center;
            font-size: 3rem;
            font-weight: 900;
            color: #fff;
            margin-bottom: 20px;
            letter-spacing: -1px;
            text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.7);
            z-index: 1100;
        }

        @media (max-width: 768px) {
            .hero-title {
                font-size: 2rem;
                margin-bottom: 10px;
                margin-left: 0;
            }
        }

        .server-notice {
            margin-top: 15px;
            margin-bottom: 20px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 4px;
            font-size: 14px;
            color: #ccc;
        }

        /* Add spinner CSS */
        .add-button .spinner {
            display: inline-block;
            width: 18px;
            height: 18px;
            border: 2px solid #fff;
            border-top: 2px solid #e50914;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
            vertical-align: middle;
            margin-left: 6px;
        }

        @keyframes spin {
            0% {
                transform: rotate(0deg);
            }

            100% {
                transform: rotate(360deg);
            }
        }

        .add-button.animated {
            animation: pop 0.3s;
        }

        @keyframes pop {
            0% {
                transform: scale(1);
            }

            50% {
                transform: scale(1.18);
            }

            100% {
                transform: scale(1);
            }
        }

        .notification.undo {
            background: #444 !important;
            color: #fff !important;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .notification.undo button {
            background: #e50914;
            color: #fff;
            border: none;
            border-radius: 4px;
            padding: 4px 14px;
            font-size: 1em;
            cursor: pointer;
        }

        .player-overlay-controls {
            position: absolute;
            left: 50%;
            bottom: 30px;
            transform: translateX(-50%) translateY(30px);
            background: rgba(20, 20, 20, 0.85);
            border-radius: 12px;
            padding: 18px 32px;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 32px;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.35s cubic-bezier(0.4,0,0.2,1);
            z-index: 3000;
        }
        .video-section:hover .player-overlay-controls,
        .player-overlay-controls:focus-within,
        .video-section.fullscreen .player-overlay-controls,
        .player-overlay-controls.fullscreen-visible {
            opacity: 1;
            pointer-events: auto;
            transform: translateX(-50%) translateY(0);
        }
        /* Fullscreen adjustments */
        .video-section.fullscreen .player-overlay-controls,
        .player-overlay-controls.fullscreen-visible {
            left: 50% !important;
            top: auto !important;
            bottom: 30px !important;
            right: auto !important;
            transform: translateX(-50%) translateY(0) !important;
            z-index: 99999 !important;
        }
        .video-section.fullscreen .player-overlay-controls.movie-server-top,
        .player-overlay-controls.movie-server-top.fullscreen-visible {
            left: 30px !important;
            top: 30px !important;
            bottom: auto !important;
            right: auto !important;
            transform: none !important;
        }
        @media (max-width: 600px) {
            .player-overlay-controls.fullscreen-visible,
            .video-section.fullscreen .player-overlay-controls {
                flex-direction: column;
                gap: 16px;
                padding: 10px 8px;
                left: 50% !important;
                bottom: 10px !important;
                top: auto !important;
            }
            .player-overlay-controls.movie-server-top.fullscreen-visible,
            .video-section.fullscreen .player-overlay-controls.movie-server-top {
                top: 8px !important;
                left: 8px !important;
                padding: 4px 8px !important;
            }
        }
        .overlay-server-selector {
            display: flex;
            gap: 12px;
        }
        .overlay-episode-selector {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .player-overlay-controls select, .player-overlay-controls label {
            font-size: 15px;
            color: #fff;
            background: #222;
            border: none;
            border-radius: 4px;
            margin: 0 4px;
            padding: 4px 8px;
        }
        .player-overlay-controls select {
            min-width: 60px;
        }
        .player-overlay-controls .server-btn {
            background: rgba(229, 9, 20, 0.8);
            border: none;
            color: #fff;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        .player-overlay-controls .server-btn.active,
        .player-overlay-controls .server-btn:focus {
            background: #fff;
            color: #e50914;
        }
        .player-overlay-controls .server-btn:not(.active):hover {
            background: #b81d24;
        }
        /* Top left for movies only */
        .player-overlay-controls.movie-server-top {
            left: 20px;
            top: 20px;
            bottom: auto;
            right: auto;
            transform: none;
            background: rgba(20, 20, 20, 0.85);
            padding: 8px 16px;
            gap: 8px;
        }
        @media (max-width: 600px) {
            .player-overlay-controls {
                flex-direction: column;
                gap: 16px;
                padding: 10px 8px;
                bottom: 10px;
            }
            .player-overlay-controls.movie-server-top {
                top: 8px;
                left: 8px;
                padding: 4px 8px;
            }
        }
        /* Overlay dropdowns for server/season/episode */
        .player-overlay-server {
            position: absolute;
            top: 24px;
            left: 24px;
            z-index: 99999;
            min-width: 90px;
            background: rgba(20,20,20,0.92);
            border-radius: 8px;
            padding: 4px 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            font-size: 13px;
        }
        .player-overlay-server select {
            background: #181818;
            color: #fff;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 13px;
            margin-left: 4px;
        }
        .player-overlay-season-episode {
            position: absolute;
            top: 24px;
            right: 24px;
            z-index: 99999;
            background: rgba(20,20,20,0.92);
            border-radius: 8px;
            padding: 4px 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
        }
        .player-overlay-season-episode select {
            background: #181818;
            color: #fff;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 13px;
        }
        @media (max-width: 600px) {
            .player-overlay-server {
                top: 8px;
                left: 8px;
                padding: 2px 4px;
                font-size: 11px;
            }
            .player-overlay-season-episode {
                top: 8px;
                right: 8px;
                padding: 2px 4px;
                font-size: 11px;
            }
        }
        .next-episode-btn {
            display: inline-flex;
            align-items: center;
            background: #181818;
            color: #fff;
            border: none;
            border-radius: 999px;
            padding: 7px 20px 7px 16px;
            font-size: 15px;
            font-weight: 600;
            box-shadow: 0 2px 8px rgba(0,0,0,0.18);
            cursor: pointer;
            transition: background 0.2s, box-shadow 0.2s, opacity 0.2s;
            outline: none;
            margin-top: 8px;
        }
        .next-episode-btn:disabled {
            background: #333;
            color: #fff;
            opacity: 0.6;
            cursor: not-allowed;
            box-shadow: none;
        }
        .next-episode-btn:hover:not(:disabled), .next-episode-btn:focus:not(:disabled) {
            background: #222;
            box-shadow: 0 4px 16px rgba(0,0,0,0.22);
        }
        .overlay {
            opacity: 1;
            transition: opacity 0.3s ease;
        }
        .overlay.hidden {
            opacity: 0;
            pointer-events: none;
        }
    </style>
    <script type="text/javascript" src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"></script>
</head>

<body>
    <!-- Netflix Navbar -->
    <nav class="navbar">
        <div style="display: flex; align-items: center;">
            <a href="index.html" class="logo" data-i18n="nav.logo">ELI6 MOVIES</a>
            <div class="nav-links">
                <a href="index.html" data-i18n="nav.home">Home</a>
                <a href="movies.html" data-i18n="nav.movies">Movies</a>
                <a href="tvshows.html" data-i18n="nav.tvshows">TV Shows</a>
                <a href="mylist.html" data-i18n="nav.mylist">My List</a>
            </div>
        </div>
        <div class="nav-right nav-icons">
            <a href="search.html" class="nav-icon">
                <i class="material-icons">search</i>
            </a>
            <a href="settings.html" class="nav-icon">
                <i class="material-icons">settings</i>
            </a>
            <a href="account.html" class="nav-icon">
                <i class="material-icons">account_circle</i>
            </a>
            <!-- Language switcher will be injected here by i18n.js -->
        </div>
    </nav>

    <!-- Netflix Hero Section -->
    <section class="hero-section">
        <div class="hero-backdrop" id="heroBackdrop"></div>
        <div class="hero-content">
            <div class="video-title-scroll"><span class="video-title" id="heroTitle" data-i18n="player.loading">Loading...</span></div>
            <div class="hero-meta">
                <span class="hero-rating" id="heroRating" data-i18n="player.na">N/A</span>
                <span class="hero-year" id="heroYear" data-i18n="player.na">N/A</span>
                <span class="hero-duration" id="heroDuration" data-i18n="player.na">N/A</span>
            </div>
            <p class="hero-description" id="heroDescription" data-i18n="player.loadingContent">Loading content information...</p>
            <div class="hero-actions">
                <button class="netflix-btn btn-play" onclick="playContent()">
                    <i class="material-icons">play_arrow</i>
                    <span data-i18n="player.play">Play</span>
                </button>
                <button class="netflix-btn btn-more" onclick="showInfo()">
                    <i class="material-icons">info</i>
                    <span data-i18n="player.moreInfo">More Info</span>
                </button>
                <button id="addButton" class="netflix-btn btn-mylist mylist-btn" data-i18n="player.addToMyList">
                    <i class="material-icons">add</i> <span data-i18n="player.addToMyList">My List</span>
                </button>
                <!-- Google Cast Button -->
                <span id="castButtonContainer" style="display:inline-block; vertical-align:middle; margin-left:12px;">
                  <google-cast-launcher id="castLauncher" style="--discovery-color:#e50914; --connected-color:#46d369; width:40px; height:40px;"></google-cast-launcher>
                </span>
                <span id="castFallback" style="display:none; color:#ccc; font-size:14px; margin-left:10px;">(Casting not supported in this browser)</span>
             
                <!-- Season and Episode Selectors (TV Shows Only) - HIDDEN -->
                <div class="episode-selector" id="episodeSelector" style="display: none;">
                    <div class="selector-group">
                        <label for="seasonSelect" data-i18n="player.season">Season:</label>
                        <select id="seasonSelect" onchange="changeSeason()">
                            <!-- Seasons will be populated here -->
                        </select>
                    </div>
                    <div class="selector-group">
                        <label for="episodeSelect" data-i18n="player.episode">Episode:</label>
                        <select id="episodeSelect" onchange="changeEpisode()">
                            <!-- Episodes will be populated here -->
                        </select>
                    </div>
                </div>
            </div>
            <div class="server-notice">
                <i class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 5px;">info</i>
                <span data-i18n="player.server_notice">If content is unavailable, try switching between servers.</span>
            </div>
        </div>
        <!-- Move the video player here, inside hero-section -->
        <div id="videoPlayer">
            <div class="video-section" id="videoSection" style="display: block; margin-top: 0;">
                <div class="video-player">
                    <div class="player-loading" id="playerLoading">Loading video player...</div>
                    <iframe id="videoIframe" class="video-iframe" style="display: none;" allowfullscreen
                        allow="fullscreen; autoplay; encrypted-media; picture-in-picture; web-share"></iframe>
                    <!-- Overlay Server Dropdown (top left) -->
                    <div class="player-overlay-server overlay" id="playerOverlayServer" style="display:none;">
                        <label for="overlayServerSelect" data-i18n="player.server">Server:</label>
                        <select id="overlayServerSelect"></select>
                    </div>
                    <!-- Overlay Season/Episode Dropdown (top right, TV only) -->
                    <div class="player-overlay-season-episode overlay" id="playerOverlaySeasonEpisode" style="display:none;">
                        <label for="overlaySeasonSelectMini" data-i18n="player.seasonShort">S:</label>
                        <select id="overlaySeasonSelectMini"></select>
                        <label for="overlayEpisodeSelectMini" data-i18n="player.episodeShort">E:</label>
                        <select id="overlayEpisodeSelectMini"></select>
                    </div>
                    <!-- Next Episode Overlay Button (moved from hero section) -->
                    <div id="nextEpisodeOverlayBtnContainer" class="overlay" style="display:none; position:absolute; top:50%; right:20px; transform:translateY(-50%); z-index:9999;">
                        <button id="nextEpisodeBtnOverlay" class="next-episode-btn" title="Skip to next episode" data-i18n-title="player.skipToNextEpisode">
                            <i class="material-icons" style="font-size: 28px; color: #fff;">skip_next</i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Netflix Content Details (always visible, under player) -->
    <section class="content-section" id="contentSection" style="display: block;">
        <!-- Netflix Tabs -->
        <div class="content-tabs">
            <button class="tab-button active" data-i18n="player.overview" data-tab="overview">Overview</button>
            <button class="tab-button" data-i18n="player.trailers" data-tab="trailers">Trailers</button>
            <button class="tab-button" data-i18n="player.cast" data-tab="cast">Cast</button>
            <button class="tab-button" data-i18n="player.similar" data-tab="similar">More Like This</button>
            <button class="tab-button" id="episodesTab" data-i18n="player.episodes" data-tab="episodes"
                style="display: none;">Episodes</button>
        </div>
        <!-- Overview Tab -->
        <div id="overviewTab" class="tab-content active">
            <div class="content-overview" id="detailedOverview"></div>
        </div>
        <!-- Trailers Tab -->
        <div id="trailersTab" class="tab-content">
            <div class="trailer-section">
                <h2 data-i18n="player.trailersVideos">Trailers & Videos</h2>
                <div class="trailer-grid" id="trailerGrid">
                    <div class="loading-text">Loading trailers...</div>
                </div>
            </div>
        </div>
        <!-- Cast Tab -->
        <div id="castTab" class="tab-content">
            <div class="cast-section">
                <h2 data-i18n="player.castCrew">Cast & Crew</h2>
                <div class="cast-grid" id="castGrid">
                    <div class="loading-text">Loading cast information...</div>
                </div>
            </div>
        </div>
        <!-- Similar Tab -->
        <div id="similarTab" class="tab-content">
            <div class="similar-section">
                <h2 data-i18n="player.moreLikeThis">More Like This</h2>
                <div class="similar-grid" id="similarGrid">
                    <div class="loading-text">Loading similar content...</div>
                </div>
            </div>
        </div>
        <!-- Episodes Tab (TV Shows Only) -->
        <div id="episodesTab" class="tab-content">
            <div class="episode-section">
                <h2 data-i18n="player.episodes">Episodes</h2>
                <div class="episodes-grid" id="episodesGrid">
                    <div class="loading-text">Loading episodes...</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Server Indicator Badge -->
    <div id="serverIndicator" class="server-indicator"></div>
    <!-- Server Switch Modal -->
    <div id="serverSwitchModal" class="server-switch-modal">
        <div class="server-switch-modal-content">
            <div id="serverSwitchMsg">Switching to backup server...</div>
            <div id="serverButtons"></div>
            <button class="report-btn" onclick="reportBrokenStream()" data-i18n="player.reportBrokenStream">Report Broken Stream</button>
        </div>
    </div>

    <script>
        const TMDB_API_KEY = '8c247ea0b4b56ed2ff7d41c9a833aa77';
        const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
        const VIDSRC_API_URL = 'https://vidsrc.to/embed';
        const VIXSRC_API_URL = 'https://vixsrc.to';
        const AUTH_API_URL = 'http://localhost:3000/api';

        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        const type = urlParams.get('type') || 'movie';
        const episode = urlParams.get('episode') || 1;
        const season = urlParams.get('season') || 1;

        let contentData = null;
        let isInMyList = false;
        let currentSeason = 1;
        let isVideoPlaying = false;
        let currentContent = null;

        console.log('Player Parameters:', { type, id, episode, season });

        // Initialize page
        document.addEventListener('DOMContentLoaded', async () => {
            await loadContentDetails();
            setupEventListeners();
            checkMyListStatus();
            // Show/hide episode selector based on type
            if (type === 'tv') {
                document.getElementById('episodeSelector').style.display = 'none'; // Always hidden
                await populateEpisodeSelectors();
            } else {
                document.getElementById('episodeSelector').style.display = 'none';
            }
            // Auto-load the video player on page load
            loadVideoPlayer();
            isVideoPlaying = true;

            // --- Add manual control buttons ---
            const videoPlayerDiv = document.querySelector('.video-player');
            if (videoPlayerDiv && !document.getElementById('manualControls')) {
                const manualControls = document.createElement('div');
                manualControls.id = 'manualControls';
                manualControls.style = 'margin-top: 16px; text-align: center;';
                manualControls.innerHTML = `
                    <button id="reportBrokenBtn" style="background:#e50914;color:#fff;border:none;padding:10px 24px;border-radius:4px;font-size:16px;cursor:pointer;margin-right:12px;">Report Broken</button>
                    <button id="reloadPlayerBtn" style="background:#444;color:#fff;border:none;padding:10px 24px;border-radius:4px;font-size:16px;cursor:pointer;">Reload Player</button>
                `;
                videoPlayerDiv.parentNode.insertBefore(manualControls, videoPlayerDiv.nextSibling);
                document.getElementById('reportBrokenBtn').onclick = () => handlePlayerError('manual report');
                document.getElementById('reloadPlayerBtn').onclick = () => loadVideoPlayer();
            }

            // Dynamically populate server dropdown
            const serverSelect = document.getElementById('overlayServerSelect');
            if (serverSelect) {
                // Only show 2Anime if type === 'anime'
                const filteredServers = SERVER_LIST.filter(srv => srv.key !== '2anime' || type === 'anime');
                serverSelect.innerHTML = filteredServers.map(srv => `<option value="${srv.key}">${srv.label}</option>`).join('');
            }
        });

        function setupEventListeners() {
            // Tab switching
            document.querySelectorAll('.tab-button').forEach(button => {
                button.addEventListener('click', () => {
                    const tab = button.getAttribute('data-tab');
                    switchTab(tab);
                });
            });
        }

        // Function to switch tabs
        function switchTab(tab) {
            // Hide all tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            // Deactivate all tab buttons
            document.querySelectorAll('.tab-button').forEach(button => {
                button.classList.remove('active');
            });

            // Activate selected tab
            document.getElementById(tab).classList.add('active');
            document.querySelector(`.tab-button[data-tab="${tab}"]`).classList.add('active');
        }

        // Load content details from TMDB or Jikan
        async function loadContentDetails() {
            try {
                if (!type || !id) {
                    throw new Error('Missing content type or ID');
                }
                if (type === 'anime') {
                    // Fetch from Jikan API
                    const response = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Jikan API error:', response.status, errorText);
                        throw new Error('Failed to fetch anime details');
                    }
                    const data = await response.json();
                    contentData = data.data;
                    await updateAnimeContentInfo();
                } else {
                    // Always use the TMDB API (with language)
                    const endpoint = type === 'tv' ? 'tv' : 'movie';
                    const lang = getTMDBLang();
                    const response = await fetch(`${TMDB_BASE_URL}/${endpoint}/${id}?api_key=${TMDB_API_KEY}&language=${lang}`);
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('TMDB API error:', response.status, errorText);
                        throw new Error('Failed to fetch content details');
                    }
                    contentData = await response.json();
                    // Fetch external_ids for IMDB ID (needed for VidSrc)
                    const extIdsResp = await fetch(`${TMDB_BASE_URL}/${endpoint}/${id}/external_ids?api_key=${TMDB_API_KEY}`);
                    if (extIdsResp.ok) {
                        contentData.external_ids = await extIdsResp.json();
                    } else {
                        contentData.external_ids = {};
                    }
                    await updateContentInfo();
                }
            } catch (e) {
                console.error('Error loading content details:', e);
                const titleEl = document.getElementById('heroTitle');
                const overviewEl = document.getElementById('heroDescription');
                titleEl.textContent = 'Error';
                overviewEl.textContent = 'Unable to load information.';
            }
        }

        // Update anime content information (Jikan)
        async function updateAnimeContentInfo() {
            const title = contentData.title || contentData.title_english || contentData.title_japanese || 'N/A';
            const overview = contentData.synopsis || 'No overview available.';
            const rating = contentData.score ? `${contentData.score.toFixed(1)} Rating` : 'N/A';
            const year = contentData.year || (contentData.aired?.from ? contentData.aired.from.split('-')[0] : 'N/A');
            const genres = contentData.genres ? contentData.genres.map(g => g.name).join(', ') : 'N/A';
            const duration = contentData.duration || 'N/A';
            const episodes = contentData.episodes ? `${contentData.episodes} eps` : 'N/A';
            const typeStr = contentData.type || 'Anime';
            const status = contentData.status || '';
            const studios = contentData.studios ? contentData.studios.map(s => s.name).join(', ') : '';
            const image = contentData.images?.jpg?.large_image_url || contentData.images?.jpg?.image_url || '';
            const trailer = contentData.trailer?.embed_url || '';

            // Update hero elements
            const heroTitle = document.getElementById('heroTitle');
            const heroDescription = document.getElementById('heroDescription');
            heroTitle.textContent = title;
            heroDescription.textContent = overview;
            document.getElementById('heroRating').textContent = rating;
            document.getElementById('heroYear').textContent = year;
            document.getElementById('heroDuration').textContent = episodes;

            // Set My List button data attribute with correct content info
            const addButton = document.getElementById('addButton');
            if (addButton && contentData) {
                addButton.setAttribute('data-mylist-item', JSON.stringify({
                    id: contentData.mal_id,
                    title: title,
                    type: 'anime',
                    poster_path: image,
                    overview: overview
                }));
            }

            // Set hero backdrop
            const heroBackdrop = document.querySelector('.hero-backdrop');
            if (heroBackdrop && image) {
                heroBackdrop.style.backgroundImage = `url('${image}')`;
            }

            // Update detailed overview with expanded information
            const detailedOverviewHTML = `
                <div class="overview-content">
                    <div class="overview-main">
                        <div><strong>Type:</strong> ${typeStr}</div>
                        <div><strong>Status:</strong> ${status}</div>
                        <div><strong>Episodes:</strong> ${episodes}</div>
                        <div><strong>Year:</strong> ${year}</div>
                        <div><strong>Studios:</strong> ${studios}</div>
                        <div><strong>Genres:</strong> ${genres}</div>
                        <div><strong>Duration:</strong> ${duration}</div>
                        <div><strong>Rating:</strong> ${rating}</div>
                    </div>
                    <div class="overview-extra">
                        <div><strong>Synopsis:</strong> ${overview}</div>
                        ${trailer ? `<div style='margin-top:20px;'><iframe width='100%' height='315' src='${trailer}' frameborder='0' allowfullscreen></iframe></div>` : ''}
                    </div>
                </div>
            `;
            document.getElementById('detailedOverview').innerHTML = detailedOverviewHTML;
        }

        // Update content information
        async function updateContentInfo() {
            const title = type === 'tv' ? contentData.name : contentData.title;
            const overview = contentData.overview || 'No overview available.';
            const rating = contentData.vote_average ? `${contentData.vote_average.toFixed(1)} Rating` : 'N/A';
            const year = type === 'tv'
                ? (contentData.first_air_date ? contentData.first_air_date.split('-')[0] : 'N/A')
                : (contentData.release_date ? contentData.release_date.split('-')[0] : 'N/A');
            const genres = contentData.genres ? contentData.genres.map(g => g.name).join(', ') : 'N/A';
            const duration = type === 'tv'
                ? (contentData.episode_run_time ? `${contentData.episode_run_time[0]}m` : 'N/A')
                : (contentData.runtime ? `${contentData.runtime}m` : 'N/A');
            const backdropPath = contentData.backdrop_path
                ? `https://image.tmdb.org/t/p/original${contentData.backdrop_path}`
                : '';
            const tagline = contentData.tagline || '';
            const status = contentData.status || '';
            const originalLanguage = contentData.original_language || '';
            const budget = contentData.budget || 0;
            const revenue = contentData.revenue || 0;
            const productionCompanies = contentData.production_companies || [];
            const spokenLanguages = contentData.spoken_languages || [];

            // Update hero elements
            const heroTitle = document.getElementById('heroTitle');
            const heroDescription = document.getElementById('heroDescription');

            heroTitle.textContent = title;
            heroDescription.textContent = overview;

            document.getElementById('heroRating').textContent = rating;
            document.getElementById('heroYear').textContent = year;
            document.getElementById('heroDuration').textContent = duration;

            // Set My List button data attribute with correct content info
            const addButton = document.getElementById('addButton');
            if (addButton && contentData) {
                addButton.setAttribute('data-mylist-item', JSON.stringify({
                    id: contentData.id,
                    title: type === 'tv' ? contentData.name : contentData.title,
                    type: type,
                    poster_path: contentData.poster_path,
                    overview: contentData.overview || ''
                }));
            }

            // Update detailed overview with expanded information
            const detailedOverviewHTML = `
                <div class="overview-content">
                    <div class="overview-main">
                        <h2 class="overview-title" data-i18n="player.synopsis">Synopsis</h2>
                        <p class="overview-text">${overview}</p>
                        ${tagline ? `<p class="overview-tagline">"${tagline}"</p>` : ''}
                    </div>
                    
                    <div class="overview-details">
                        <div class="detail-section">
                            <h3 data-i18n="player.details">Details</h3>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <span class="detail-label" data-i18n="player.type">Type:</span>
                                    <span class="detail-value" data-i18n="player.tvOrMovie">${type === 'tv' ? 'TV Series' : 'Movie'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label" data-i18n="player.year">Year:</span>
                                    <span class="detail-value">${year}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label" data-i18n="player.rating">Rating:</span>
                                    <span class="detail-value rating-value">${rating}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label" data-i18n="player.duration">Duration:</span>
                                    <span class="detail-value">${duration}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label" data-i18n="player.genres">Genres:</span>
                                    <span class="detail-value">${genres}</span>
                                </div>
                                ${status ? `
                                <div class="detail-item">
                                    <span class="detail-label" data-i18n="player.status">Status:</span>
                                    <span class="detail-value">${status}</span>
                                </div>
                                ` : ''}
                                ${originalLanguage ? `
                                <div class="detail-item">
                                    <span class="detail-label" data-i18n="player.originalLanguage">Original Language:</span>
                                    <span class="detail-value">${originalLanguage.toUpperCase()}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        ${productionCompanies.length > 0 ? `
                        <div class="detail-section">
                            <h3 data-i18n="player.productionCompanies">Production Companies</h3>
                            <div class="companies-list">
                                ${productionCompanies.map(company => `
                                    <span class="company-tag">${company.name}</span>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                        
                        ${spokenLanguages.length > 0 ? `
                        <div class="detail-section">
                            <h3 data-i18n="player.languages">Languages</h3>
                            <div class="languages-list">
                                ${spokenLanguages.map(lang => `
                                    <span class="language-tag">${lang.english_name || lang.name}</span>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                        
                        ${type === 'movie' && (budget > 0 || revenue > 0) ? `
                        <div class="detail-section">
                            <h3 data-i18n="player.financialInfo">Financial Information</h3>
                            <div class="detail-grid">
                                ${budget > 0 ? `
                                <div class="detail-item">
                                    <span class="detail-label" data-i18n="player.budget">Budget:</span>
                                    <span class="detail-value">$${(budget / 1000000).toFixed(1)}M</span>
                                </div>
                                ` : ''}
                                ${revenue > 0 ? `
                                <div class="detail-item">
                                    <span class="detail-label" data-i18n="player.revenue">Revenue:</span>
                                    <span class="detail-value">$${(revenue / 1000000).toFixed(1)}M</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;

            document.getElementById('detailedOverview').innerHTML = detailedOverviewHTML;

            if (backdropPath) {
                document.getElementById('heroBackdrop').style.backgroundImage = `url(${backdropPath})`;
            }

            // After updating the Add to My List button, call window.initMyListButtons() if it exists
            if (typeof window.initMyListButtons === 'function') {
                window.initMyListButtons();
            }
        }

        // --- Server Switching System ---
        const SERVER_LIST = [
            { key: 'vixsrc', label: 'VIXSRC' },
            { key: 'vidsrc', label: 'VidSrc' },
            { key: 'superembed', label: 'Superembed' },
            { key: '2anime', label: '2Anime' },
            { key: '2embed', label: '2Embed' } // <-- Added 2Embed
        ];
        let currentServerIndex = 0;

        // --- Refactored error handling ---
        let errorHandled = false;

        function updateServerIndicator() {
            const badge = document.getElementById('serverIndicator');
            badge.textContent = 'Server: ' + SERVER_LIST[currentServerIndex].label;
        }

        function showServerSwitchModal(msg, allowManual = true) {
            document.getElementById('serverSwitchMsg').innerHTML = msg;
            // Manual server buttons
            const btns = SERVER_LIST.map((srv, i) =>
                `<button class="server-btn-manual${i === currentServerIndex ? ' active' : ''}" onclick="manualSwitchServer(${i})" ${i === currentServerIndex ? 'disabled' : ''}>${srv.label}</button>`
            ).join(' ');
            document.getElementById('serverButtons').innerHTML = allowManual ? btns : '';
            document.getElementById('serverSwitchModal').classList.add('active');
            setTimeout(() => {
                document.getElementById('serverSwitchModal').classList.remove('active');
            }, 3000);
        }
        function closeServerSwitchModal() {
            document.getElementById('serverSwitchModal').classList.remove('active');
        }
        function manualSwitchServer(idx) {
            currentServerIndex = idx;
            closeServerSwitchModal();
            loadVideoPlayer();
        }
        function reportBrokenStream() {
            alert('Thank you for reporting. We will investigate this stream.');
            closeServerSwitchModal();
        }

        // --- Global error handler for video player ---
        function handlePlayerError(reason) {
            if (errorHandled) return;
            errorHandled = true;
            console.log(`[Player] Error detected: ${reason}.`);
            // Do not show any error message or modal
            // (Removed userMsg creation and text)
        }

        // Load video player
        function loadVideoPlayer() {
            errorHandled = false; // Reset error flag on each load
            const playerLoading = document.getElementById('playerLoading');
            const videoIframe = document.getElementById('videoIframe');

            updateServerIndicator();

            // For debugging
            console.log('[Player] Using server:', SERVER_LIST[currentServerIndex].label);

            // Get current season and episode from selectors (for TV shows)
            let currentSeasonValue = parseInt(season);
            let currentEpisodeValue = parseInt(episode);

            if (type === 'tv') {
                const seasonSelect = document.getElementById('seasonSelect');
                const episodeSelect = document.getElementById('episodeSelect');
                if (seasonSelect && episodeSelect) {
                    currentSeasonValue = parseInt(seasonSelect.value);
                    currentEpisodeValue = parseInt(episodeSelect.value);
                }
                if (!currentSeasonValue || isNaN(currentSeasonValue) || currentSeasonValue < 1) currentSeasonValue = 1;
                if (!currentEpisodeValue || isNaN(currentEpisodeValue) || currentEpisodeValue < 1) currentEpisodeValue = 1;
            }

            let videoUrl = '';
            const currentServer = SERVER_LIST[currentServerIndex].key;
            let vidSrcId = id;
            let imdbId = '';
            if (type === 'tv' && contentData && contentData.external_ids && contentData.external_ids.imdb_id) {
                vidSrcId = contentData.external_ids.imdb_id;
                imdbId = contentData.external_ids.imdb_id;
            } else if (type === 'movie' && contentData && contentData.external_ids && contentData.external_ids.imdb_id) {
                imdbId = contentData.external_ids.imdb_id;
            }
            let vidsrcMovieId = '';
            if (type === 'movie') {
                if (contentData && contentData.external_ids && contentData.external_ids.imdb_id && contentData.external_ids.imdb_id.startsWith('tt')) {
                    vidsrcMovieId = contentData.external_ids.imdb_id;
                } else {
                    vidsrcMovieId = id;
                }
            }
            if (currentServer === 'vidsrc') {
                if (type === 'movie') {
                    videoUrl = `https://vidsrc.to/embed/movie/${vidsrcMovieId}`;
                } else if (type === 'tv') {
                    videoUrl = `https://vidsrc.to/embed/tv/${vidSrcId}/${currentSeasonValue}/${currentEpisodeValue}`;
                }
                // Do NOT add query string for VidSrc
            } else if (currentServer === 'vixsrc') {
                if (type === 'movie') {
                    videoUrl = `https://vixsrc.to/movie/${id}`;
                } else if (type === 'tv') {
                    videoUrl = `https://vixsrc.to/tv/${id}/${currentSeasonValue}/${currentEpisodeValue}`;
                }
                videoUrl += '?primaryColor=E50914&secondaryColor=170000&autoplay=true';
            } else if (currentServer === 'superembed') {
                // Use public Superembed player URL directly
                let superembedBase = 'https://multiembed.mov/?';
                let params = [];
                if (type === 'movie') {
                    if (contentData && contentData.external_ids && contentData.external_ids.imdb_id) {
                        params.push('video_id=' + contentData.external_ids.imdb_id);
                    } else {
                        params.push('video_id=' + id);
                    }
                    if (contentData && contentData.external_ids && contentData.external_ids.tmdb_id) {
                        params.push('tmdb=1');
                    }
                } else if (type === 'tv') {
                    if (contentData && contentData.external_ids && contentData.external_ids.imdb_id) {
                        params.push('video_id=' + contentData.external_ids.imdb_id);
                    } else {
                        params.push('video_id=' + id);
                    }
                    if (contentData && contentData.external_ids && contentData.external_ids.tmdb_id) {
                        params.push('tmdb=1');
                    }
                    params.push('s=' + currentSeasonValue);
                    params.push('e=' + currentEpisodeValue);
                }
                videoUrl = superembedBase + params.join('&');
            } else if (currentServer === '2anime') {
                // 2Anime server logic
                // If link_url is present, use it directly
                const linkUrl = urlParams.get('link_url');
                if (type === 'anime' && linkUrl) {
                    videoUrl = `https://2anime.xyz/embed/${linkUrl}`;
                } else {
                    // Fallback to old logic
                    let animeTitle = id; // id should be the anime slug (e.g., 'one-piece')
                    let episodeNum = episode || 1;
                    if (type === 'anime' && animeTitle && episodeNum) {
                        videoUrl = `https://2anime.xyz/embed/${animeTitle}-episode-${episodeNum}`;
                    } else {
                        videoUrl = 'about:blank';
                        setTimeout(() => {
                            const iframe = document.getElementById('videoIframe');
                            if (iframe) {
                                iframe.style.display = 'none';
                                const playerLoading = document.getElementById('playerLoading');
                                if (playerLoading) {
                                    playerLoading.style.display = 'block';
                                    playerLoading.innerHTML = `Anime server requires type=anime, id (anime slug), and episode number in the URL.<br>type=${type}, id=${animeTitle}, episode=${episodeNum}`;
                                }
                            }
                        }, 100);
                    }
                }
            } else if (currentServer === '2embed') {
                // 2Embed logic
                let imdb = '';
                let tmdb = '';
                if (contentData && contentData.external_ids) {
                    imdb = contentData.external_ids.imdb_id || '';
                    tmdb = contentData.external_ids.tmdb_id || '';
                }
                if (type === 'movie') {
                    if (imdb && imdb.startsWith('tt')) {
                        videoUrl = `https://www.2embed.cc/embed/${imdb}`;
                    } else if (tmdb) {
                        videoUrl = `https://www.2embed.cc/embed/${tmdb}`;
                    } else {
                        videoUrl = 'about:blank';
                    }
                } else if (type === 'tv') {
                    if (imdb && imdb.startsWith('tt')) {
                        videoUrl = `https://www.2embed.cc/embedtv/${imdb}&s=${currentSeasonValue}&e=${currentEpisodeValue}`;
                    } else if (tmdb) {
                        videoUrl = `https://www.2embed.cc/embedtv/${tmdb}&s=${currentSeasonValue}&e=${currentEpisodeValue}`;
                    } else {
                        videoUrl = 'about:blank';
                    }
                } else {
                    videoUrl = 'about:blank';
                }
            }

            // Debug panel
            let debugPanel = document.getElementById('debugPanel');
            if (!debugPanel) {
                debugPanel = document.createElement('div');
                debugPanel.id = 'debugPanel';
                debugPanel.style = 'position:fixed;bottom:0;left:0;background:#222;color:#fff;padding:10px;z-index:99999;font-size:13px;max-width:100vw;overflow-x:auto;opacity:0.95;';
                document.body.appendChild(debugPanel);
            }
            debugPanel.innerHTML = `<b>Debug Info</b><br>
                <b>Type:</b> ${type}<br>
                <b>TMDB ID:</b> ${id}<br>
                <b>IMDB ID:</b> ${imdbId || '(none)'}<br>
                <b>VidSrc Movie ID Used:</b> ${vidsrcMovieId || '(none)'}<br>
                <b>Server:</b> ${currentServer}<br>
                <b>Video URL:</b> <a href='${videoUrl}' target='_blank' style='color:#4af'>${videoUrl}</a>`;

            playerLoading.style.display = 'none';
            videoIframe.style.display = 'block';

            videoIframe.src = videoUrl;
            videoIframe.allowFullscreen = true;
            videoIframe.allow = 'fullscreen; autoplay; encrypted-media; picture-in-picture; web-share';
            videoIframe.setAttribute('allowfullscreen', 'true');
            videoIframe.setAttribute('webkitallowfullscreen', 'true');
            videoIframe.setAttribute('mozallowfullscreen', 'true');
            videoIframe.setAttribute('msallowfullscreen', 'true');
            videoIframe.setAttribute('allowfullscreen', 'true');
            videoIframe.setAttribute('fullscreen', 'true');

            // Remove previous event listeners by replacing the iframe
            const newIframe = videoIframe.cloneNode(true);
            videoIframe.parentNode.replaceChild(newIframe, videoIframe);

            // Attach error and load handlers
            newIframe.onerror = () => handlePlayerError('iframe error');
            newIframe.onload = () => {
                closeServerSwitchModal();
                errorHandled = false;
                if (failoverTimeout) clearTimeout(failoverTimeout);
                // For cross-origin iframes, we cannot check the content. If onload fires, assume success.
                // (Removed setTimeout that tried to access contentWindow/contentDocument)
            };
            // Timeout for load failure
            setTimeout(() => {
                if (!errorHandled) {
                    handlePlayerError('timeout');
                }
            }, 8000);
            // At the end of loadVideoPlayer, always update overlay dropdowns
            updateOverlayDropdowns();
        }

        // Show server unavailable message
        function showServerUnavailableMessage() {
            const videoSection = document.getElementById('videoSection');
            const contentSection = document.getElementById('contentSection');

            if (videoSection && contentSection) {
                // Show content section again
                videoSection.style.display = 'none';
                contentSection.style.display = 'block';

                // Show alert with helpful message
                alert(`Content is currently unavailable on ${SERVER_LIST[currentServerIndex].label}. Please try switching to another server.`);

                // Reset video playing state
                isVideoPlaying = false;
            }
        }

        // Show more info
        function showInfo() {
            // No longer toggles sections, just scrolls to content
            isVideoPlaying = false;
            document.getElementById('contentSection').scrollIntoView({ behavior: 'smooth' });
        }

        // Load trailers
        async function loadTrailers() {
            try {
                const endpoint = type === 'tv' ? 'tv' : 'movie';
                console.log('Loading trailers for:', { endpoint, id, type });
                const response = await fetch(`${TMDB_BASE_URL}/${endpoint}/${id}/videos?api_key=${TMDB_API_KEY}`);
                if (response.ok) {
                    const data = await response.json();
                    console.log('Videos API response:', data);

                    // Filter for videos - be more inclusive
                    const trailers = data.results.filter(video => {
                        // Must be from YouTube
                        if (video.site !== 'YouTube') return false;

                        // Accept trailers, teasers, and any video with "trailer" in the name
                        const videoType = video.type?.toLowerCase();
                        const videoName = video.name?.toLowerCase();

                        if (videoType === 'trailer' || videoType === 'teaser') return true;
                        if (videoName && videoName.includes('trailer')) return true;

                        return false;
                    }).slice(0, 10); // Limit to 10 trailers

                    console.log('Filtered trailers:', trailers);

                    const trailerGrid = document.getElementById('trailerGrid');
                    if (trailerGrid && trailers.length > 0) {
                        trailerGrid.innerHTML = trailers.map((trailer, index) => `
                            <div class="trailer-item" onclick="playTrailer('${trailer.key}')">
                                <div class="trailer-thumbnail">
                                    <img src="https://img.youtube.com/vi/${trailer.key}/mqdefault.jpg" alt="${trailer.name}">
                                    <div class="trailer-play-overlay">
                                        <i class="material-icons">play_arrow</i>
                                    </div>
                                </div>
                                <div class="trailer-title">${trailer.name}</div>
                            </div>
                        `).join('');

                        // Add click handlers for lazy loading
                        document.querySelectorAll('.trailer-placeholder').forEach(placeholder => {
                            placeholder.addEventListener('click', function () {
                                const youtubeId = this.getAttribute('data-youtube-id');
                                const trailerName = this.querySelector('.trailer-title').textContent;
                                loadTrailerVideo(this, youtubeId, trailerName);
                            });
                        });

                        // Mark trailer titles for translation
                        document.querySelectorAll('.trailer-title').forEach(titleElement => {
                            if (originalText) {
                            }
                        });
                    } else if (trailerGrid) {
                        trailerGrid.innerHTML = '<div class="loading-text">No official trailers available</div>';
                    }
                }
            } catch (error) {
                console.error('Error loading trailers:', error);
                const trailerGrid = document.getElementById('trailerGrid');
                if (trailerGrid) {
                    trailerGrid.innerHTML = '<div class="error-text">Error loading trailers</div>';
                }
            }
        }

        // Load individual trailer video
        function loadTrailerVideo(placeholder, youtubeId, trailerName) {
            try {
                // Replace placeholder with iframe
                placeholder.innerHTML = `
                    <iframe class="trailer-video" 
                            src="https://www.youtube.com/embed/${youtubeId}?autoplay=1" 
                            frameborder="0" 
                            allowfullscreen
                            allow="autoplay; encrypted-media">
                    </iframe>
                    <div class="trailer-info">
                        <div class="trailer-title">${trailerName}</div>
                        <div class="trailer-description">Playing...</div>
                    </div>
                `;
            } catch (error) {
                console.error('Error loading trailer video:', error);
                placeholder.innerHTML = `
                    <div class="trailer-error">
                        <div class="error-text">Error loading video</div>
                        <button onclick="location.reload()" class="netflix-btn btn-play">Retry</button>
                    </div>
                `;
            }
        }

        // Load cast
        async function loadCast() {
            try {
                const response = await fetch(`${TMDB_BASE_URL}/${type}/${id}/credits?api_key=${TMDB_API_KEY}`);
                if (response.ok) {
                    const data = await response.json();
                    const cast = data.cast.slice(0, 12); // Show first 12 cast members

                    const castGrid = document.getElementById('castGrid');
                    if (cast.length > 0) {
                        castGrid.innerHTML = cast.map(person => `
                            <div class="cast-item">
                                <img class="cast-photo" 
                                     src="${person.profile_path ? `https://image.tmdb.org/t/p/w500${person.profile_path}` : 'https://via.placeholder.com/500x750/2a2a2a/ffffff?text=No+Image'}" 
                                     alt="${person.name}">
                                <div class="cast-info">
                                    <div class="cast-name">${person.name}</div>
                                    <div class="cast-character">${person.character}</div>
                                </div>
                            </div>
                        `).join('');

                        // Mark cast names and characters for translation
                        document.querySelectorAll('.cast-name, .cast-character').forEach(element => {
                            if (originalText) {
                            }
                        });
                    } else {
                        castGrid.innerHTML = '<div class="loading-text">No cast information available</div>';
                    }
                }
            } catch (error) {
                console.error('Error loading cast:', error);
            }
        }

        // Load similar content
        async function loadSimilar() {
            try {
                const response = await fetch(`${TMDB_BASE_URL}/${type}/${id}/similar?api_key=${TMDB_API_KEY}`);
                if (response.ok) {
                    const data = await response.json();
                    const similar = data.results.slice(0, 12); // Show first 12 similar items

                    const similarGrid = document.getElementById('similarGrid');
                    if (similar.length > 0) {
                        similarGrid.innerHTML = similar.map(item => `
                            <div class="similar-item" onclick="navigateToContent(${item.id})">
                                <img class="similar-poster" 
                                     src="${item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/500x750/2a2a2a/ffffff?text=No+Image'}" 
                                     alt="${type === 'tv' ? item.name : item.title}">
                                <div class="similar-info">
                                    <div class="similar-title">${type === 'tv' ? item.name : item.title}</div>
                                    <div class="similar-meta">${type === 'tv' ? (item.first_air_date ? item.first_air_date.split('-')[0] : 'N/A') : (item.release_date ? item.release_date.split('-')[0] : 'N/A')}</div>
                                </div>
                            </div>
                        `).join('');
                    } else {
                        similarGrid.innerHTML = '<div class="loading-text">No similar content available</div>';
                    }
                }
            } catch (error) {
                console.error('Error loading similar content:', error);
            }
        }

        // Load episodes (TV shows only)
        async function loadEpisodes() {
            try {
                const response = await fetch(`${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}`);
                if (response.ok) {
                    const showData = await response.json();
                    const totalSeasons = showData.number_of_seasons;

                    // Create season selector
                    const seasonSelector = document.getElementById('seasonSelect');
                    seasonSelector.innerHTML = '';

                    for (let i = 1; i <= totalSeasons; i++) {
                        const button = document.createElement('button');
                        button.className = `season-button ${i === 1 ? 'active' : ''}`;
                        button.textContent = `Season ${i}`;
                        button.onclick = () => loadSeasonEpisodes(i);
                        seasonSelector.appendChild(button);
                    }

                    // Load first season episodes
                    await loadSeasonEpisodes(1);
                }
            } catch (error) {
                console.error('Error loading episodes:', error);
            }
        }

        // Load season episodes
        async function loadSeasonEpisodes(seasonNumber) {
            try {
                // Update active season button
                document.querySelectorAll('.season-button').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');

                const response = await fetch(`${TMDB_BASE_URL}/tv/${id}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`);
                if (response.ok) {
                    const seasonData = await response.json();
                    const episodes = seasonData.episodes;

                    const episodesGrid = document.getElementById('episodesGrid');
                    if (episodes && episodes.length > 0) {
                        episodesGrid.innerHTML = episodes.map(episode => `
                            <div class="episode-item" onclick="playEpisode(${episode.episode_number}, ${seasonNumber})">
                                <img class="episode-still" 
                                     src="${episode.still_path ? `https://image.tmdb.org/t/p/w500${episode.still_path}` : 'https://via.placeholder.com/500x281/2a2a2a/ffffff?text=No+Image'}" 
                                     alt="${episode.name}">
                                <div class="episode-info">
                                    <div class="episode-number">Episode ${episode.episode_number}</div>
                                    <div class="episode-title">${episode.name}</div>
                                    <div class="episode-meta">
                                        <span>${episode.runtime || 45}m</span>
                                        <span>${episode.air_date ? episode.air_date.split('-')[0] : 'N/A'}</span>
                                    </div>
                                    <div class="episode-overview">${episode.overview || 'No description available.'}</div>
                                </div>
                            </div>
                        `).join('');

                    } else {
                        episodesGrid.innerHTML = '<div class="loading-text">No episodes available</div>';
                    }
                }
            } catch (error) {
                console.error('Error loading season episodes:', error);
            }
        }

        // Check if content is in My List
        async function checkMyListStatus() {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await fetch(`${AUTH_API_URL}/user/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    isInMyList = data.myList.some(item => item.id === parseInt(id) && item.type === type);
                    updateAddButton();
                }
            } catch (error) {
                console.error('Error checking My List status:', error);
            }
        }

        // Update Add to List button
        function updateAddButton() {
            const addButton = document.getElementById('addButton');

            if (isInMyList) {
                addButton.classList.add('in-list');
                addButton.innerHTML = '<i class="material-icons">check</i> My List';
            } else {
                addButton.classList.remove('in-list');
                addButton.innerHTML = '<i class="material-icons">add</i> My List';
            }
        }

        // Toggle My List
        async function toggleMyList() {
            const addButton = document.getElementById('addButton');
            if (!addButton) return;
            addButton.disabled = true;
            addButton.classList.add('animated');
            const icon = addButton.querySelector('.material-icons');
            const origIcon = icon ? icon.textContent : '';
            // Show spinner
            if (!addButton.querySelector('.spinner')) {
                addButton.insertAdjacentHTML('beforeend', '<span class="spinner"></span>');
            }
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    showNotification('Please log in to use this feature', 'error');
                    addButton.disabled = false;
                    addButton.classList.remove('animated');
                    const sp = addButton.querySelector('.spinner');
                    if (sp) sp.remove();
                    return;
                }

                const item = {
                    id: parseInt(id),
                    title: type === 'tv' ? contentData.name : contentData.title,
                    type: type,
                    poster_path: contentData.poster_path,
                    overview: contentData.overview || ''
                };

                const response = await fetch(`${AUTH_API_URL}/user/mylist`, {
                    method: isInMyList ? 'DELETE' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(item)
                });

                if (response.ok) {
                    // For undo: store last removed item
                    let undoTimeout = null;
                    let lastRemoved = null;
                    isInMyList = !isInMyList;
                    updateAddButton();
                    // Sync with localStorage for cross-page consistency
                    const profileRes = await fetch(`${AUTH_API_URL}/user/profile`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (profileRes.ok) {
                        const data = await profileRes.json();
                        localStorage.setItem('myList', JSON.stringify(data.myList));
                    }
                    if (isInMyList) {
                        showNotification('Added to My List', 'success');
                    } else {
                        lastRemoved = { ...item };
                        showUndoNotification('Removed from My List', async () => {
                            // Undo: re-add the item
                            addButton.disabled = true;
                            if (!addButton.querySelector('.spinner')) {
                                addButton.insertAdjacentHTML('beforeend', '<span class="spinner"></span>');
                            }
                            await fetch(`${AUTH_API_URL}/user/mylist`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify(lastRemoved)
                            });
                            isInMyList = true;
                            updateAddButton();
                            // Sync localStorage
                            const profileRes = await fetch(`${AUTH_API_URL}/user/profile`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (profileRes.ok) {
                                const data = await profileRes.json();
                                localStorage.setItem('myList', JSON.stringify(data.myList));
                            }
                            showNotification('Undo: Added back to My List', 'success');
                            addButton.disabled = false;
                            const sp = addButton.querySelector('.spinner');
                            if (sp) sp.remove();
                        });
                    }
                } else {
                    const error = await response.json();
                    showNotification(error.message || 'Failed to update My List', 'error');
                }
            } catch (error) {
                console.error('Error updating My List:', error);
                showNotification('Failed to update My List', 'error');
            } finally {
                addButton.disabled = false;
                addButton.classList.remove('animated');
                const sp = addButton.querySelector('.spinner');
                if (sp) sp.remove();
            }
        }

        // Notification function
        function showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 20px;
                background: ${type === 'success' ? '#2ecc71' : '#e74c3c'};
                color: white;
                border-radius: 4px;
                z-index: 9999;
                animation: fadeInOut 3s forwards;
            `;
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        // Undo notification
        function showUndoNotification(message, onUndo) {
            const notification = document.createElement('div');
            notification.className = 'notification undo';
            notification.innerHTML = `<span>${message}</span><button>Undo</button>`;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 20px;
                background: #444;
                color: white;
                border-radius: 4px;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 12px;
                animation: fadeInOut 3s forwards;
            `;
            const undoBtn = notification.querySelector('button');
            let undone = false;
            undoBtn.onclick = async () => {
                if (undone) return;
                undone = true;
                notification.remove();
                await onUndo();
            };
            document.body.appendChild(notification);
            setTimeout(() => {
                if (!undone) notification.remove();
            }, 3000);
        }

        // Navigation functions
        function navigateToContent(contentId) {
            window.location.href = `player.php?type=${type}&id=${contentId}`;
        }

        function playEpisode(episodeNumber, seasonNumber) {
            window.location.href = `player.php?type=tv&id=${id}&season=${seasonNumber}&episode=${episodeNumber}`;
        }

        function showError(message) {
            const videoPlayer = document.querySelector('.video-player');
            videoPlayer.innerHTML = `
                <div class="player-error">
                    ${message}
                    <br><br>
                    <button onclick="goBack()" style="background: #e50914; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                        Go Back
                    </button>
                </div>
            `;
        }

        function goBack() {
            const referrer = document.referrer;
            if (referrer && referrer.includes(window.location.origin)) {
                window.history.back();
            } else {
                window.location.href = type === 'tv' ? 'tvshows.html' : 'movies.html';
            }
        }

        // Switch server
        function switchServer(server) {
            currentServerIndex = SERVER_LIST.findIndex(s => s.key === server);
            loadVideoPlayer();
        }

        // Change season
        function changeSeason() {
            const seasonSelect = document.getElementById('seasonSelect');
            const newSeason = parseInt(seasonSelect.value);
            currentSeason = newSeason;

            // Reset episode to 1 when changing seasons
            const episodeSelect = document.getElementById('episodeSelect');
            episodeSelect.value = 1;

            // Reload episodes for the new season
            loadSeasonEpisodes(newSeason);

            // Reload video player if currently playing
            if (isVideoPlaying) {
                loadVideoPlayer();
            }
        }

        // Change episode
        function changeEpisode() {
            const episodeSelect = document.getElementById('episodeSelect');
            const newEpisode = parseInt(episodeSelect.value);

            // Reload video player if currently playing
            if (isVideoPlaying) {
                loadVideoPlayer();
            }
        }

        // Populate season and episode selectors
        async function populateEpisodeSelectors() {
            if (type !== 'tv') return;
            try {
                const response = await fetch(`${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}`);
                if (response.ok) {
                    const showData = await response.json();
                    const totalSeasons = showData.number_of_seasons;
                    // Populate season selector
                    const seasonSelect = document.getElementById('seasonSelect');
                    seasonSelect.innerHTML = '';
                    let initialSeason = parseInt(season);
                    if (!initialSeason || isNaN(initialSeason) || initialSeason < 1) initialSeason = 1;
                    for (let i = 1; i <= totalSeasons; i++) {
                        const option = document.createElement('option');
                        option.value = i;
                        option.textContent = `Season ${i}`;
                        if (i === initialSeason) {
                            option.selected = true;
                        }
                        seasonSelect.appendChild(option);
                    }
                    // Load episodes for the current season
                    await loadSeasonEpisodesForSelector(initialSeason);
                    // Keep episode selector hidden
                    document.getElementById('episodeSelector').style.display = 'none';
                    updateOverlayDropdowns();
                    updateNextEpisodeBtnOverlay(); // <-- update button after populating
                }
            } catch (error) {
                console.error('Error populating episode selectors:', error);
            }
        }

        // Load episodes for selector
        async function loadSeasonEpisodesForSelector(seasonNumber) {
            try {
                const response = await fetch(`${TMDB_BASE_URL}/tv/${id}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`);
                if (response.ok) {
                    const seasonData = await response.json();
                    window.seasonEpisodesData[seasonNumber] = seasonData.episodes;
                    // Populate episode selector as before
                    const episodeSelect = document.getElementById('episodeSelect');
                    episodeSelect.innerHTML = '';
                    if (seasonData.episodes && seasonData.episodes.length > 0) {
                        seasonData.episodes.forEach(episode => {
                            const option = document.createElement('option');
                            option.value = episode.episode_number;
                            option.textContent = `Episode ${episode.episode_number}`;
                            if (episode.episode_number === parseInt(episode)) {
                                option.selected = true;
                            }
                            episodeSelect.appendChild(option);
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading season episodes for selector:', error);
            }
        }

        // Restore Play button functionality: play selected server in fullscreen
        function playContent() {
            // Reload the video player with the selected server
            loadVideoPlayer();
            isVideoPlaying = true;
            // Enter fullscreen mode
            const videoSection = document.getElementById('videoSection');
            if (videoSection.requestFullscreen) {
                videoSection.requestFullscreen();
            } else if (videoSection.webkitRequestFullscreen) {
                videoSection.webkitRequestFullscreen();
            } else if (videoSection.mozRequestFullScreen) {
                videoSection.mozRequestFullScreen();
            } else if (videoSection.msRequestFullscreen) {
                videoSection.msRequestFullscreen();
            }
        }

        // Listen for language change and reload content
        if (window.i18n) {
            const origChangeLanguage = window.i18n.changeLanguage.bind(window.i18n);
            window.i18n.changeLanguage = async function(lang) {
                await origChangeLanguage(lang);
                await loadContentDetails();
            };
        }

        // --- Overlay Controls Logic ---
        function updateOverlayControls() {
            // Server buttons
            document.getElementById('serverBtnVixsrc').classList.toggle('active', currentServerIndex === 0);
            document.getElementById('serverBtnVidsrc').classList.toggle('active', currentServerIndex === 1);
            // Episode selector
            if (type === 'tv') {
                document.getElementById('overlayEpisodeSelector').style.display = 'flex';
                // Sync season/episode dropdowns
                const origSeason = document.getElementById('seasonSelect');
                const origEpisode = document.getElementById('episodeSelect');
                const overlaySeason = document.getElementById('overlaySeasonSelect');
                const overlayEpisode = document.getElementById('overlayEpisodeSelect');
                if (origSeason && overlaySeason) {
                    overlaySeason.innerHTML = origSeason.innerHTML;
                    overlaySeason.value = origSeason.value;
                }
                if (origEpisode && overlayEpisode) {
                    overlayEpisode.innerHTML = origEpisode.innerHTML;
                    overlayEpisode.value = origEpisode.value;
                }
                // Remove top-left class for TV
                document.querySelector('.player-overlay-controls').classList.remove('movie-server-top');
            } else {
                document.getElementById('overlayEpisodeSelector').style.display = 'none';
                // Move server switcher to top left for movies
                document.querySelector('.player-overlay-controls').classList.add('movie-server-top');
            }
        }
        document.addEventListener('DOMContentLoaded', () => {
            updateOverlayControls();
            // Keep overlays in sync when selectors change
            const origSeason = document.getElementById('seasonSelect');
            const origEpisode = document.getElementById('episodeSelect');
            if (origSeason) origSeason.addEventListener('change', updateOverlayControls);
            if (origEpisode) origEpisode.addEventListener('change', updateOverlayControls);

            // --- Overlay selector event listeners ---
            const overlaySeason = document.getElementById('overlaySeasonSelect');
            const overlayEpisode = document.getElementById('overlayEpisodeSelect');
            if (overlaySeason) overlaySeason.addEventListener('change', function() {
                const origSeason = document.getElementById('seasonSelect');
                if (origSeason) {
                    origSeason.value = this.value;
                    origSeason.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            if (overlayEpisode) overlayEpisode.addEventListener('change', function() {
                const origEpisode = document.getElementById('episodeSelect');
                if (origEpisode) {
                    origEpisode.value = this.value;
                    origEpisode.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        });
        // --- Overlay Dropdown Logic ---
        function updateOverlayDropdowns() {
            const serverOverlay = document.getElementById('playerOverlayServer');
            const serverSelect = document.getElementById('overlayServerSelect');
            const seasonEpOverlay = document.getElementById('playerOverlaySeasonEpisode');
            const seasonSelectMini = document.getElementById('overlaySeasonSelectMini');
            const episodeSelectMini = document.getElementById('overlayEpisodeSelectMini');
            // Show/hide overlays
            if (type === 'movie') {
                if (serverOverlay) serverOverlay.style.display = 'flex'; // Always show for movies
                if (seasonEpOverlay) seasonEpOverlay.style.display = 'none';
            } else if (type === 'tv') {
                if (serverOverlay) serverOverlay.style.display = 'flex';
                if (seasonEpOverlay) seasonEpOverlay.style.display = 'flex';
            } else {
                if (serverOverlay) serverOverlay.style.display = 'none';
                if (seasonEpOverlay) seasonEpOverlay.style.display = 'none';
            }
            // Set server dropdown value
            if (serverSelect) {
                serverSelect.value = SERVER_LIST[currentServerIndex].key;
            }
            // Sync season/episode dropdowns for TV
            if (type === 'tv') {
                // Copy options from main selectors
                const origSeason = document.getElementById('seasonSelect');
                const origEpisode = document.getElementById('episodeSelect');
                if (origSeason && seasonSelectMini) {
                    seasonSelectMini.innerHTML = origSeason.innerHTML;
                    seasonSelectMini.value = origSeason.value;
                }
                if (origEpisode && episodeSelectMini) {
                    episodeSelectMini.innerHTML = origEpisode.innerHTML;
                    episodeSelectMini.value = origEpisode.value;
                }
            }
        }

        // --- Setup all event listeners after DOMContentLoaded ---
        document.addEventListener('DOMContentLoaded', () => {
            // Overlay server selector
            const serverSelect = document.getElementById('overlayServerSelect');
            if (serverSelect) serverSelect.addEventListener('change', function() {
                const idx = SERVER_LIST.findIndex(s => s.key === this.value);
                if (idx !== -1) {
                    currentServerIndex = idx;
                    loadVideoPlayer();
                    updateOverlayDropdowns();
                }
            });
            // Overlay season/episode selectors
            const seasonSelectMini = document.getElementById('overlaySeasonSelectMini');
            const episodeSelectMini = document.getElementById('overlayEpisodeSelectMini');
            if (seasonSelectMini) seasonSelectMini.addEventListener('change', function() {
                const origSeason = document.getElementById('seasonSelect');
                if (origSeason) {
                    origSeason.value = this.value;
                    origSeason.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            if (episodeSelectMini) episodeSelectMini.addEventListener('change', function() {
                const origEpisode = document.getElementById('episodeSelect');
                if (origEpisode) {
                    origEpisode.value = this.value;
                    origEpisode.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            // Main season/episode selectors update overlay on change
            const origSeason = document.getElementById('seasonSelect');
            const origEpisode = document.getElementById('episodeSelect');
            if (origSeason) origSeason.addEventListener('change', updateOverlayDropdowns);
            if (origEpisode) origEpisode.addEventListener('change', updateOverlayDropdowns);
            // Server switch buttons in hero section
            document.querySelectorAll('.server-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const server = this.textContent.trim().toLowerCase();
                    const idx = SERVER_LIST.findIndex(s => s.key === server);
                    if (idx !== -1) {
                        currentServerIndex = idx;
                        loadVideoPlayer();
                        updateOverlayDropdowns();
                    }
                });
            });
        });

        // === AUTO NEXT EPISODE FEATURE (REFACTOR) ===
        let autoNextEnabled = localStorage.getItem('autoNextEnabled') === 'true';
        let autoNextTimeout = null;

        function getNextEpisodeInfo() {
            const seasonSelect = document.getElementById('seasonSelect');
            const episodeSelect = document.getElementById('episodeSelect');
            if (!seasonSelect || !episodeSelect) return null;
            const currentSeason = parseInt(seasonSelect.value);
            const currentEpisode = parseInt(episodeSelect.value);
            let nextEpisode = null, nextSeason = currentSeason;
            if (episodeSelect.selectedIndex < episodeSelect.options.length - 1) {
                nextEpisode = parseInt(episodeSelect.options[episodeSelect.selectedIndex + 1].value);
            } else if (seasonSelect.selectedIndex < seasonSelect.options.length - 1) {
                nextSeason = parseInt(seasonSelect.options[seasonSelect.selectedIndex + 1].value);
                nextEpisode = 1;
            }
            if (nextEpisode) {
                return { nextEpisode, nextSeason };
            }
            return null;
        }

        function updateIframeForCurrentSelection() {
            const seasonSelect = document.getElementById('seasonSelect');
            const episodeSelect = document.getElementById('episodeSelect');
            const videoIframe = document.getElementById('videoIframe');
            if (!seasonSelect || !episodeSelect || !videoIframe) return;
            let currentSeasonValue = parseInt(seasonSelect.value);
            let currentEpisodeValue = parseInt(episodeSelect.value);
            if (!currentSeasonValue || isNaN(currentSeasonValue) || currentSeasonValue < 1) currentSeasonValue = 1;
            if (!currentEpisodeValue || isNaN(currentEpisodeValue) || currentEpisodeValue < 1) currentEpisodeValue = 1;
            let videoUrl = '';
            const currentServer = SERVER_LIST[currentServerIndex].key;
            let vidSrcId = id;
            if (type === 'tv' && contentData && contentData.external_ids && contentData.external_ids.imdb_id) {
                vidSrcId = contentData.external_ids.imdb_id;
            }
            if (currentServer === 'vidsrc') {
                videoUrl = `https://vidsrc.to/embed/tv/${vidSrcId}/${currentSeasonValue}/${currentEpisodeValue}`;
            } else if (currentServer === 'vixsrc') {
                videoUrl = `https://vixsrc.to/tv/${id}/${currentSeasonValue}/${currentEpisodeValue}`;
                videoUrl += '?primaryColor=E50914&secondaryColor=170000&autoplay=true';
            } else if (currentServer === 'superembed') {
                // Use public Superembed player URL directly
                let superembedBase = 'https://multiembed.mov/?';
                let params = [];
                if (type === 'movie') {
                    if (contentData && contentData.external_ids && contentData.external_ids.imdb_id) {
                        params.push('video_id=' + contentData.external_ids.imdb_id);
                    } else {
                        params.push('video_id=' + id);
                    }
                    if (contentData && contentData.external_ids && contentData.external_ids.tmdb_id) {
                        params.push('tmdb=1');
                    }
                } else if (type === 'tv') {
                    if (contentData && contentData.external_ids && contentData.external_ids.imdb_id) {
                        params.push('video_id=' + contentData.external_ids.imdb_id);
                    } else {
                        params.push('video_id=' + id);
                    }
                    if (contentData && contentData.external_ids && contentData.external_ids.tmdb_id) {
                        params.push('tmdb=1');
                    }
                    params.push('s=' + currentSeasonValue);
                    params.push('e=' + currentEpisodeValue);
                }
                videoUrl = superembedBase + params.join('&');
            } else if (currentServer === '2anime') {
                // 2Anime server logic
                // If link_url is present, use it directly
                const linkUrl = urlParams.get('link_url');
                if (type === 'anime' && linkUrl) {
                    videoUrl = `https://2anime.xyz/embed/${linkUrl}`;
                } else {
                    // Fallback to old logic
                    let animeTitle = id; // id should be the anime slug (e.g., 'one-piece')
                    let episodeNum = episode || 1;
                    if (type === 'anime' && animeTitle && episodeNum) {
                        videoUrl = `https://2anime.xyz/embed/${animeTitle}-episode-${episodeNum}`;
                    } else {
                        videoUrl = 'about:blank';
                        setTimeout(() => {
                            const iframe = document.getElementById('videoIframe');
                            if (iframe) {
                                iframe.style.display = 'none';
                                const playerLoading = document.getElementById('playerLoading');
                                if (playerLoading) {
                                    playerLoading.style.display = 'block';
                                    playerLoading.innerHTML = `Anime server requires type=anime, id (anime slug), and episode number in the URL.<br>type=${type}, id=${animeTitle}, episode=${episodeNum}`;
                                }
                            }
                        }, 100);
                    }
                }
            } else if (currentServer === '2embed') {
                // 2Embed logic
                let imdb = '';
                let tmdb = '';
                if (contentData && contentData.external_ids) {
                    imdb = contentData.external_ids.imdb_id || '';
                    tmdb = contentData.external_ids.tmdb_id || '';
                }
                if (type === 'movie') {
                    if (imdb && imdb.startsWith('tt')) {
                        videoUrl = `https://www.2embed.cc/embed/${imdb}`;
                    } else if (tmdb) {
                        videoUrl = `https://www.2embed.cc/embed/${tmdb}`;
                    } else {
                        videoUrl = 'about:blank';
                    }
                } else if (type === 'tv') {
                    if (imdb && imdb.startsWith('tt')) {
                        videoUrl = `https://www.2embed.cc/embedtv/${imdb}&s=${currentSeasonValue}&e=${currentEpisodeValue}`;
                    } else if (tmdb) {
                        videoUrl = `https://www.2embed.cc/embedtv/${tmdb}&s=${currentSeasonValue}&e=${currentEpisodeValue}`;
                    } else {
                        videoUrl = 'about:blank';
                    }
                } else {
                    videoUrl = 'about:blank';
                }
            }
            videoIframe.src = videoUrl;
        }

        function goToNextEpisodeInPlayer() {
            const info = getNextEpisodeInfo();
            if (!info) {
                showNotification('No more episodes available.', 'error');
                return;
            }
            // Update selectors
            const seasonSelect = document.getElementById('seasonSelect');
            const episodeSelect = document.getElementById('episodeSelect');
            if (!seasonSelect || !episodeSelect) return;
            // If next season, reload episodes for that season and then select episode 1
            if (parseInt(seasonSelect.value) !== info.nextSeason) {
                seasonSelect.value = info.nextSeason;
                // Load episodes for new season, then select episode 1 and update iframe
                loadSeasonEpisodesForSelector(info.nextSeason).then(() => {
                    episodeSelect.value = info.nextEpisode;
                    updateIframeForCurrentSelection();
                    updateOverlayDropdowns(); // Sync overlay selectors
                    updateNextEpisodeBtnOverlay(); // Update next episode button state
                });
            } else {
                episodeSelect.value = info.nextEpisode;
                updateIframeForCurrentSelection();
                updateOverlayDropdowns(); // Sync overlay selectors
                updateNextEpisodeBtnOverlay(); // Update next episode button state
            }
        }

        function showNextEpisodeOverlay() {
            // Removed - no longer needed since we have the overlay button on the player
        }

        // --- AUTO NEXT: Get runtime for current episode ---
        function getCurrentEpisodeRuntimeSeconds() {
            // Try to get runtime from loaded season/episode data
            const seasonSelect = document.getElementById('seasonSelect');
            const episodeSelect = document.getElementById('episodeSelect');
            let runtime = null;
            if (seasonSelect && episodeSelect && window.seasonEpisodesData) {
                const seasonNum = parseInt(seasonSelect.value);
                const episodeNum = parseInt(episodeSelect.value);
                const episodes = window.seasonEpisodesData[seasonNum];
                if (episodes) {
                    const ep = episodes.find(e => e.episode_number === episodeNum);
                    if (ep && ep.runtime) runtime = ep.runtime;
                }
            }
            // Fallback to contentData.episode_run_time[0] (average)
            if (!runtime && contentData && contentData.episode_run_time && contentData.episode_run_time.length > 0) {
                runtime = contentData.episode_run_time[0];
            }
            // Fallback to 45 minutes
            if (!runtime) runtime = 45;
            return runtime * 60; // seconds
        }

        // --- Patch loadSeasonEpisodesForSelector to cache episode data ---
        const origLoadSeasonEpisodesForSelector = loadSeasonEpisodesForSelector;
        window.seasonEpisodesData = {};
        loadSeasonEpisodesForSelector = async function(seasonNumber) {
            const response = await fetch(`${TMDB_BASE_URL}/tv/${id}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`);
            if (response.ok) {
                const seasonData = await response.json();
                window.seasonEpisodesData[seasonNumber] = seasonData.episodes;
                // Populate episode selector as before
                const episodeSelect = document.getElementById('episodeSelect');
                episodeSelect.innerHTML = '';
                if (seasonData.episodes && seasonData.episodes.length > 0) {
                    seasonData.episodes.forEach(episode => {
                        const option = document.createElement('option');
                        option.value = episode.episode_number;
                        option.textContent = `Episode ${episode.episode_number}`;
                        if (episode.episode_number === parseInt(episode)) {
                            option.selected = true;
                        }
                        episodeSelect.appendChild(option);
                    });
                }
            }
            // Call original for any other logic
            return origLoadSeasonEpisodesForSelector.apply(this, arguments);
        };

        // --- Auto-next timer logic ---
        let autoNextPreTimer = null;
        function startAutoNextTimer() {
            if (type !== 'tv' || !autoNextEnabled) return;
            cancelAutoNext();
            const info = getNextEpisodeInfo();
            if (!info) return;
            const timerDiv = document.getElementById('autoNextTimer');
            if (!timerDiv) return;
            timerDiv.style.display = 'none'; // Hide until 1 min before end
            // Get runtime in seconds
            const runtimeSec = getCurrentEpisodeRuntimeSeconds();
            const secondsBeforeEnd = 60;
            let preTimerSec = runtimeSec - secondsBeforeEnd;
            if (preTimerSec < 10) preTimerSec = 10; // Always at least 10s after load
            // Start a timer to show the auto-next overlay at the right time
            autoNextPreTimer = setTimeout(() => {
                let seconds = secondsBeforeEnd;
                timerDiv.style.display = 'block';
                timerDiv.innerHTML = '';
                const textSpan = document.createElement('span');
                textSpan.textContent = `Next episode in ${seconds} seconds... `;
                const cancelBtn = document.createElement('button');
                cancelBtn.id = 'cancelAutoNextBtn';
                cancelBtn.style = 'margin-left:10px;background:#444;color:#fff;border:none;padding:2px 8px;border-radius:3px;cursor:pointer;';
                cancelBtn.textContent = 'Cancel';
                cancelBtn.onclick = cancelAutoNext;
                timerDiv.appendChild(textSpan);
                timerDiv.appendChild(cancelBtn);
                if (autoNextTimeout) clearTimeout(autoNextTimeout);
                function tick() {
                    seconds--;
                    if (seconds > 0) {
                        textSpan.textContent = `Next episode in ${seconds} seconds... `;
                        autoNextTimeout = setTimeout(tick, 1000);
                    } else {
                        timerDiv.style.display = 'none';
                        goToNextEpisodeInPlayer();
                    }
                }
                autoNextTimeout = setTimeout(tick, 1000);
            }, preTimerSec * 1000);
        }

        function cancelAutoNext() {
            if (autoNextTimeout) clearTimeout(autoNextTimeout);
            if (autoNextPreTimer) clearTimeout(autoNextPreTimer);
            const timerDiv = document.getElementById('autoNextTimer');
            if (timerDiv) timerDiv.style.display = 'none';
        }

        // Patch into video player load logic
        const origLoadVideoPlayer = loadVideoPlayer;
        loadVideoPlayer = function() {
            origLoadVideoPlayer.apply(this, arguments);
            setTimeout(() => {
                cancelAutoNext();
                if (autoNextEnabled && type === 'tv') {
                    startAutoNextTimer();
                }
            }, 1000);
        };

        // --- Next Episode Button Logic ---
        function updateNextEpisodeBtnOverlay() {
            const container = document.getElementById('nextEpisodeOverlayBtnContainer');
            const btn = document.getElementById('nextEpisodeBtnOverlay');
            if (!btn || !container) return;
            if (type !== 'tv') {
                container.style.display = 'none';
                return;
            }
            const info = getNextEpisodeInfo();
            if (info) {
                container.style.display = 'block';
                btn.disabled = false;
                btn.title = 'Go to next episode';
            } else {
                container.style.display = 'block';
                btn.disabled = true;
                btn.title = 'No more episodes';
            }
        }
        document.addEventListener('DOMContentLoaded', () => {
            const btn = document.getElementById('nextEpisodeBtnOverlay');
            if (btn) {
                btn.onclick = goToNextEpisodeInPlayer;
            }
            // Update on load and when selectors change
            const seasonSelect = document.getElementById('seasonSelect');
            const episodeSelect = document.getElementById('episodeSelect');
            if (seasonSelect) seasonSelect.addEventListener('change', updateNextEpisodeBtnOverlay);
            if (episodeSelect) episodeSelect.addEventListener('change', updateNextEpisodeBtnOverlay);
            updateNextEpisodeBtnOverlay();
        });

        // === Overlay Auto-Hide Logic ===
        (function() {
            const HIDE_DELAY = 2000; // 2 seconds
            let hideTimeout = null;
            let lastActivity = Date.now();
            const videoSection = document.getElementById('videoSection');
            const overlays = [
                document.getElementById('playerOverlayServer'),
                document.getElementById('playerOverlaySeasonEpisode'),
                document.getElementById('nextEpisodeOverlayBtnContainer')
            ];

            function showOverlays() {
                overlays.forEach(overlay => {
                    if (overlay) overlay.style.opacity = '1';
                    if (overlay) overlay.style.pointerEvents = 'auto';
                });
            }
            function hideOverlays() {
                overlays.forEach(overlay => {
                    if (overlay) overlay.style.opacity = '0';
                    if (overlay) overlay.style.pointerEvents = 'none';
                });
            }
            function resetHideTimer() {
                showOverlays();
                lastActivity = Date.now();
                if (hideTimeout) clearTimeout(hideTimeout);
                hideTimeout = setTimeout(() => {
                    // Only hide if mouse is not over overlays or video section
                    if (!isMouseOverOverlay) {
                        hideOverlays();
                    }
                }, HIDE_DELAY);
            }
            let isMouseOverOverlay = false;
            overlays.forEach(overlay => {
                if (!overlay) return;
                overlay.addEventListener('mouseenter', () => {
                    isMouseOverOverlay = true;
                    showOverlays();
                    if (hideTimeout) clearTimeout(hideTimeout);
                });
                overlay.addEventListener('mouseleave', () => {
                    isMouseOverOverlay = false;
                    resetHideTimer();
                });
            });
            if (videoSection) {
                videoSection.addEventListener('mousemove', resetHideTimer);
                videoSection.addEventListener('mousedown', resetHideTimer);
                videoSection.addEventListener('touchstart', resetHideTimer);
                videoSection.addEventListener('keydown', resetHideTimer);
                videoSection.addEventListener('mouseenter', resetHideTimer);
            }
            // Show overlays on initial load
            showOverlays();
            resetHideTimer();
        })();

        // === WATCH PROGRESS TRACKING FOR IFRAME PLAYERS ===
        let watchStartTime = null;
        let watchTimer = null;
        let estimatedProgress = 0;
        let estimatedDuration = 0;

        function getEstimatedDuration() {
            // Try to get duration from contentData
            if (type === 'movie' && contentData && contentData.runtime) {
                return contentData.runtime * 60; // seconds
            }
            if (type === 'tv' && contentData && contentData.episode_run_time && contentData.episode_run_time.length > 0) {
                return contentData.episode_run_time[0] * 60; // seconds
            }
            // Fallback: 90 min for movies, 45 min for TV
            return type === 'movie' ? 5400 : 2700;
        }

        function startWatchProgressTimer() {
            watchStartTime = Date.now();
            estimatedDuration = getEstimatedDuration();
            if (watchTimer) clearInterval(watchTimer);
            watchTimer = setInterval(sendWatchProgress, 15000); // every 15s
        }

        function stopWatchProgressTimer() {
            if (watchTimer) clearInterval(watchTimer);
            sendWatchProgress(true); // send final progress
        }

        function sendWatchProgress(isFinal = false) {
            if (!localStorage.getItem('token')) return;
            if (!id || !type) return;
            if (!watchStartTime) return;
            const now = Date.now();
            const secondsWatched = Math.floor((now - watchStartTime) / 1000);
            // If final, assume they watched the rest
            let progress = Math.min(100, Math.round((secondsWatched / estimatedDuration) * 100));
            if (isFinal && progress < 95) progress = 95; // If they leave, assume almost done
            // Don't send if progress is 0
            if (progress <= 0) return;
            // Send to backend
            fetch(`${AUTH_API_URL}/user/watch-history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    item: {
                        id: parseInt(id),
                        title: type === 'tv' ? (contentData ? contentData.name : '') : (contentData ? contentData.title : ''),
                        type: type,
                        poster_path: contentData ? contentData.poster_path : '',
                        overview: contentData ? contentData.overview : '',
                        progress: progress,
                        last_watched: new Date().toISOString()
                    }
                })
            });
        }

        // Start/stop timer on player load/unload
        window.addEventListener('DOMContentLoaded', () => {
            startWatchProgressTimer();
        });
        window.addEventListener('beforeunload', () => {
            stopWatchProgressTimer();
        });

        function getTMDBLang() {
            return window.i18n ? window.i18n.getTMDBLanguage() : 'en-US';
        }
        // TMDB per-language cache utility (same as in i18n.js)
        window.tmdbCache = window.tmdbCache || {
            get(endpoint, lang) {
                const key = `tmdb_${endpoint}_${lang}`;
                const cached = localStorage.getItem(key);
                if (window.tmdbDebug) console.log(`[TMDB CACHE] GET ${key}:`, !!cached);
                if (!cached) return null;
                try {
                    return JSON.parse(cached);
                } catch (e) {
                    return null;
                }
            },
            set(endpoint, lang, data) {
                const key = `tmdb_${endpoint}_${lang}`;
                try {
                    localStorage.setItem(key, JSON.stringify(data));
                    if (window.tmdbDebug) console.log(`[TMDB CACHE] SET ${key}`);
                } catch (e) {}
            },
            clear() {
                Object.keys(localStorage).forEach(k => {
                    if (k.startsWith('tmdb_')) localStorage.removeItem(k);
                });
                if (window.tmdbDebug) console.log('[TMDB CACHE] CLEARED');
            }
        };
        window.tmdbDebug = false;
        // Show/hide loading spinner for metadata
        function showMetaLoading() {
            document.getElementById('meta-loading').style.display = 'block';
        }
        function hideMetaLoading() {
            document.getElementById('meta-loading').style.display = 'none';
        }
        // Add spinner overlay to metadata area
        if (!document.getElementById('meta-loading')) {
            const spinner = document.createElement('div');
            spinner.id = 'meta-loading';
            spinner.style = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:none;align-items:center;justify-content:center;';
            spinner.innerHTML = '<div class="loading-spinner"></div>';
            document.getElementById('metadata-area').appendChild(spinner);
        }
        // Fallback to English for missing fields
        async function fetchWithFallback(endpoint, lang) {
            let data = window.tmdbCache.get(endpoint, lang);
            if (!data) {
                const resp = await fetch(`${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}&language=${lang}`);
                data = await resp.json();
                window.tmdbCache.set(endpoint, lang, data);
            }
            // If missing fields, fetch en-US and fill gaps
            if (lang !== 'en-US') {
                const missing = ['title','overview','name'].filter(f => !data[f]);
                if (missing.length) {
                    let enData = window.tmdbCache.get(endpoint, 'en-US');
                    if (!enData) {
                        const enResp = await fetch(`${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}&language=en-US`);
                        enData = await enResp.json();
                        window.tmdbCache.set(endpoint, 'en-US', enData);
                    }
                    missing.forEach(f => { if (enData[f]) data[f] = enData[f]; });
                }
            }
            return data;
        }
        // Only update metadata, not video, on language change
        async function updateMetadataOnly() {
            showMetaLoading();
            const endpoint = type === 'tv' ? `/tv/${id}` : `/movie/${id}`;
            const lang = getTMDBLang();
            const data = await fetchWithFallback(endpoint, lang);
            // ... update metadata UI with data ...
            hideMetaLoading();
            // Debug panel
            if (window.tmdbDebug) {
                let debugPanel = document.getElementById('tmdb-debug-panel');
                if (!debugPanel) {
                    debugPanel = document.createElement('div');
                    debugPanel.id = 'tmdb-debug-panel';
                    debugPanel.style = 'position:fixed;bottom:0;right:0;background:#222;color:#fff;padding:10px;z-index:99999;font-size:12px;max-width:300px;';
                    document.body.appendChild(debugPanel);
                }
                debugPanel.innerHTML = `<b>TMDB Debug</b><br>Lang: ${lang}<br>Endpoint: ${endpoint}<br>Missing: ${['title','overview','name'].filter(f => !data[f]).join(', ')}`;
            }
        }
        // Listen for language changes and only update metadata
        if (window.i18n) {
            const origChangeLanguage = window.i18n.changeLanguage.bind(window.i18n);
            window.i18n.changeLanguage = async function(lang) {
                await origChangeLanguage(lang);
                await updateMetadataOnly();
            };
        }

        // Google Cast Framework Initialization
        window['__onGCastApiAvailable'] = function(isAvailable) {
          if (isAvailable) {
            cast.framework.CastContext.getInstance().setOptions({
              receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
              autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
            });
            document.getElementById('castButtonContainer').style.display = 'inline-block';
            document.getElementById('castFallback').style.display = 'none';
          } else {
            document.getElementById('castButtonContainer').style.display = 'none';
            document.getElementById('castFallback').style.display = 'inline';
          }
        };
    </script>
    <!-- Server Error Modal -->
    <div id="serverErrorModal"
        style="display:none; position:fixed; z-index:99999; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.7); align-items:center; justify-content:center;">
        <div
            style="background:#181818; color:#fff; border-radius:12px; padding:40px 30px; max-width:400px; text-align:center; box-shadow:0 8px 32px rgba(0,0,0,0.5); animation: fadeIn 0.3s;">
            <i class="material-icons" style="font-size:48px; color:#e50914; margin-bottom:16px;">error_outline</i>
            <div id="serverErrorText" style="font-size:18px; margin-bottom:24px;">This server is
                unavailable.<br>Switching to another server...</div>
            <button id="serverErrorClose"
                style="background:#e50914; color:#fff; border:none; border-radius:4px; padding:10px 24px; font-size:16px; cursor:pointer; display:none;">Close</button>
        </div>
    </div>

    <script src="js/mylist.js"></script>
    <script>
      (function() {
        const player = document.getElementById('videoPlayer');
        if (!player) return;
        const overlays = player.querySelectorAll('.overlay');
        let hideTimeout;

        function showOverlays() {
          overlays.forEach(el => el.classList.remove('hidden'));
        }
        function hideOverlays() {
          overlays.forEach(el => el.classList.add('hidden'));
        }

        player.addEventListener('mousemove', () => {
          showOverlays();
          clearTimeout(hideTimeout);
          hideTimeout = setTimeout(hideOverlays, 2000);
        });

        player.addEventListener('click', () => {
          showOverlays();
          clearTimeout(hideTimeout);
          hideTimeout = setTimeout(hideOverlays, 2000);
        });

        // OPTIONAL: hide them initially after page load
        hideTimeout = setTimeout(hideOverlays, 2000);
      })();
    </script>
</body>

</html>