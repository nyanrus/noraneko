/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import {
  Flex,
  Text,
  useColorModeValue,
  Link,
  Image,
  Spacer,
  VStack,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import Card from "@/components/Card";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import Preferences from "./prerferences";

export default function PanelSidebar() {
  const { t } = useTranslation();
  const textColor = useColorModeValue("gray.800", "gray.100");

  const methods = useForm({
    defaultValues: {},
  });
  const { setValue } = methods;
  const watchAll = useWatch({
    control: methods.control,
  });

  return (
    <Flex direction="column" alignItems="center" maxW="700px" mx="auto" py={8}>
      <Text fontSize="3xl" mb={10} color={textColor}>
        パネルサイドバー
      </Text>
      <Text mb={8}>
        パネルサイドバーは様々なツール、ウェブサイト、拡張機能をウインドウの側面に表示することができる機能です。ここではパネルのカスタマイズ、追加、削除、管理を行うことができます。
      </Text>
      <VStack align="stretch" spacing={6} w="100%">
        <FormProvider {...methods}>
          <Preferences />
        </FormProvider>
      </VStack>
    </Flex>
  );
}
