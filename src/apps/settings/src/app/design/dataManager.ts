export async function saveDesignSettings(settings: any) {
  if (Object.keys(settings).length === 0) {
    return;
  }
  return await new Promise((resolve, reject) => {
    window.NRSPrefGet(
      {
        prefName: "floorp.design.configs",
        prefType: "string",
      },
      (result: { prefValue: string | null; error?: string }) => {
        if (result.error) {
          reject(new Error(result.error));
          return;
        }
        if (!result.prefValue) {
          reject(new Error("No existing design config found"));
          return;
        }

        const oldData = JSON.parse(result.prefValue);

        const newData = {
          ...oldData,
          globalConfigs: {
            ...oldData.globalConfigs,
            userInterface: settings.design,
          },
          tabbar: {
            ...oldData.tabbar,
            tabbarPosition: settings.position,
            tabbarStyle: settings.style,
          },
          tab: {
            ...oldData.tab,
            tabScroll: {
              ...oldData.tab.tabScroll,
              reverse: settings.tabScrollReverse,
              wrap: settings.tabScrollWrap,
              enabled: settings.tabScroll,
            },
            tabOpenPosition: settings.tabOpenPosition,
            tabMinHeight: settings.tabMinHeight,
            tabMinWidth: settings.tabMinWidth,
            tabPinTitle: settings.tabPinTitle,
            tabDubleClickToClose: settings.tabDubleClickToClose,
          },
        };

        window.NRSPrefSet(
          {
            prefType: "string",
            prefName: "floorp.design.configs",
            prefValue: JSON.stringify(newData),
          },
          (result: { success?: boolean; error?: string }) => {
            if (result.error) {
              reject(new Error(result.error));
            } else {
              resolve(true);
            }
          },
        );
      },
    );
  });
}

export async function getDesignSettings(): Promise<DesignSettings> {
  return await new Promise((resolve, reject) => {
    window.NRSPrefGet(
      {
        prefName: "floorp.design.configs",
        prefType: "string",
      },
      (result: { prefValue: string | null; error?: string }) => {
        if (result.error) {
          reject(new Error(result.error));
          return;
        }
        if (!result.prefValue) {
          reject(new Error("No design config found"));
          return;
        }

        const data = JSON.parse(result.prefValue);
        const formData: DesignSettings = {
          design: data.globalConfigs.userInterface,
          position: data.tabbar.tabbarPosition,
          style: data.tabbar.tabbarStyle,
          tabOpenPosition: data.tab.tabOpenPosition,
          tabMinHeight: data.tab.tabMinHeight,
          tabMinWidth: data.tab.tabMinWidth,
          tabPinTitle: data.tab.tabPinTitle,
          tabScrollReverse: data.tab.tabScroll.reverse,
          tabScrollWrap: data.tab.tabScroll.wrap,
          tabDubleClickToClose: data.tab.tabDubleClickToClose,
          tabScroll: data.tab.tabScroll.enabled,
        };
        resolve(formData);
      },
    );
  });
}
