import {
  Divider,
  HStack,
  Text,
  Link,
  Spacer,
  useColorModeValue,
  Flex,
} from "@chakra-ui/react";
import type React from "react";

function Card({
  title,
  children,
  icon,
  footerLink,
  footerChildren,
  footerLinkText,
  ...props
}: {
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  footerLink?: string;
  footerLinkText?: string;
  footerChildren?: React.ReactNode;
  [key: string]: unknown;
}) {
  return (
    <Flex
      flexDirection={"column"}
      borderWidth={1}
      borderRadius="xl"
      p={"12px 18px"}
      borderColor={useColorModeValue("gray.300", "gray.600")}
      {...props}
    >
      <HStack mb={3}>
        {icon}
        {title ? (
          <Text
            // fontFamily={`"Google Sans",Roboto,A1rial,sans-serif`}
            lineHeight={"1.75em"}
            fontSize={"1.375rem"}
            fontWeight={"400"}
          >
            {title}
          </Text>
        ) : null}
      </HStack>
      {children}
      <Spacer />
      {(footerLinkText && footerLink) || footerChildren ? (
        <Footer footerLink={footerLink} footerLinkText={footerLinkText} />
      ) : null}
    </Flex>
  );
}
export default Card;

function Footer({
  footerChildren,
  footerLink,
  footerLinkText,
}: {
  footerChildren?: React.ReactNode;
  footerLink?: string;
  footerLinkText?: string;
}) {
  return (
    <>
      <Divider ml={"-20px"} pr={"40px"} mt={4} />
      <Link
        href={footerLink}
        _hover={{ textDecoration: "none" }}
        target="_blank"
        onClick={(e) => {
          if (footerLink?.startsWith("about:")) {
            e.preventDefault();
            window.NRAddTab(footerLink);
          }
        }}
      >
        <HStack
          align="flex-start"
          m={"8px 10px -5px 5px"}
          p={"8px 10px"}
          rounded={"15px"}
          _hover={{ bg: useColorModeValue("gray.100", "gray.700") }}
        >
          {footerLink ? (
            <Text
              color={useColorModeValue("blue.500", "blue.400")}
              fontSize="sm"
            >
              {footerLinkText}
            </Text>
          ) : (
            footerChildren
          )}
          <Spacer />
          <IconIcOutlineOpenInNew style={{ fontSize: "16px" }} />
        </HStack>
      </Link>
    </>
  );
}
