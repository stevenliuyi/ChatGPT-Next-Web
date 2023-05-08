"use client";

require("../polyfill");

import { useState, useRef, useEffect } from "react";

import styles from "./home.module.scss";
import uiStyles from "./ui-lib.module.scss";

import BotIcon from "../icons/bot.svg";
import LoadingIcon from "../icons/three-dots.svg";
import ChatGptIcon from "../icons/chatgpt.svg";

import { getCSSVar, useMobileScreen } from "../utils";

import dynamic from "next/dynamic";
import { Path, SlotID } from "../constant";
import { ErrorBoundary } from "./error";

import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { SideBar } from "./sidebar";
import { useAppConfig } from "../store/config";

import { useAccessStore } from "../store";
import { Modal, PasswordInput } from "./ui-lib";
import { IconButton } from "./button";
import Locale from "../locales";
import { requestUsage } from "../requests";

export function Loading(props: { noLogo?: boolean }) {
  return (
    <div className={styles["loading-content"] + " no-dark"}>
      {!props.noLogo && <BotIcon />}
      <LoadingIcon />
    </div>
  );
}

const Settings = dynamic(async () => (await import("./settings")).Settings, {
  loading: () => <Loading noLogo />,
});

const Chat = dynamic(async () => (await import("./chat")).Chat, {
  loading: () => <Loading noLogo />,
});

const NewChat = dynamic(async () => (await import("./new-chat")).NewChat, {
  loading: () => <Loading noLogo />,
});

const MaskPage = dynamic(async () => (await import("./mask")).MaskPage, {
  loading: () => <Loading noLogo />,
});

export function useSwitchTheme() {
  const config = useAppConfig();

  useEffect(() => {
    document.body.classList.remove("light");
    document.body.classList.remove("dark");

    if (config.theme === "dark") {
      document.body.classList.add("dark");
    } else if (config.theme === "light") {
      document.body.classList.add("light");
    }

    const metaDescriptionDark = document.querySelector(
      'meta[name="theme-color"][media]',
    );
    const metaDescriptionLight = document.querySelector(
      'meta[name="theme-color"]:not([media])',
    );

    if (config.theme === "auto") {
      metaDescriptionDark?.setAttribute("content", "#151515");
      metaDescriptionLight?.setAttribute("content", "#fafafa");
    } else {
      const themeColor = getCSSVar("--themeColor");
      metaDescriptionDark?.setAttribute("content", themeColor);
      metaDescriptionLight?.setAttribute("content", themeColor);
    }
  }, [config.theme]);
}

const useHasHydrated = () => {
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return hasHydrated;
};

function Screen() {
  const config = useAppConfig();
  const location = useLocation();
  const isHome = location.pathname === Path.Home;
  const isMobileScreen = useMobileScreen();

  return (
    <div
      className={
        styles.container +
        ` ${
          config.tightBorder && !isMobileScreen
            ? styles["tight-container"]
            : styles.container
        }`
      }
    >
      <SideBar className={isHome ? styles["sidebar-show"] : ""} />

      <div className={styles["window-content"]} id={SlotID.AppBody}>
        <Routes>
          <Route path={Path.Home} element={<Chat />} />
          <Route path={Path.NewChat} element={<NewChat />} />
          <Route path={Path.Masks} element={<MaskPage />} />
          <Route path={Path.Chat} element={<Chat />} />
          <Route path={Path.Settings} element={<Settings />} />
        </Routes>
      </div>
    </div>
  );
}

export function SignInPage(props: {
  onSuccess: () => void;
  onUpdate: () => void;
}) {
  const accessStore = useAccessStore();
  const [accessCode, setAccessCode] = useState("");
  const checkAccesCode = () => {
    props.onUpdate();
    accessStore.updateCode(accessCode);
    requestUsage()
      .then((res) => {
        if (!res?.used) {
          setAccessCode("");
        } else {
          props.onSuccess();
        }
      })
      .catch(() => setAccessCode(""));
  };

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  });

  return (
    <div className={uiStyles["signin-container"]}>
      <div className={uiStyles["signin-logo"] + " no-dark"}>
        <ChatGptIcon />
      </div>
      <Modal title="ChatGPT">
        <PasswordInput
          ref={inputRef}
          value={accessCode}
          type="text"
          placeholder={Locale.Settings.AccessCode.Placeholder}
          onChange={(e) => setAccessCode(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key == "Enter") checkAccesCode();
          }}
        />
        <IconButton text={"Log In"} onClick={checkAccesCode} />
      </Modal>
    </div>
  );
}

export function Home() {
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);

  requestUsage()
    .then((res) => {
      if (res?.used) {
        setSignedIn(true);
      } else {
        setSignedIn(false);
      }
    })
    .catch(() => setSignedIn(false));

  useSwitchTheme();

  if (!useHasHydrated()) {
    return <Loading />;
  }

  if (signedIn == undefined) {
    return <Loading />;
  }

  return (
    <ErrorBoundary>
      <Router>
        {signedIn == true && <Screen />}
        {signedIn == false && (
          <SignInPage
            onSuccess={() => setSignedIn(true)}
            onUpdate={() => setSignedIn(undefined)}
          />
        )}
      </Router>
    </ErrorBoundary>
  );
}
