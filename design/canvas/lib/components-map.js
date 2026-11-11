import * as C from '@wordpress/components';
import { Icon as WPIcon, desktop, mobile, tablet, undo, redo, external, chevronLeft, chevronRight, plus, check, styles, layout, typography, color, brush, settings, seen, upload, reset, grid, list, image, cog, info, close, copy, help, starFilled, shuffle, globe, chevronDown } from '@wordpress/icons';
const icons = { desktop, mobile, tablet, undo, redo, external, chevronLeft, chevronRight, plus, check, styles, layout, typography, color, brush, settings, seen, upload, reset, grid, list, image, cog, info, close, copy, help, starFilled, shuffle, globe, chevronDown };
const React = window.React;
function Icon(props) { const { name, ...rest } = props; return React.createElement(WPIcon, { icon: icons[name] || name, ...rest }); }
function IconButton(props) { const { name, ...rest } = props; return React.createElement(C.Button, { icon: icons[name], ...rest }); }
window.WPC = {
  Button: C.Button, IconButton, Icon,
  Panel: C.Panel, PanelBody: C.PanelBody, PanelRow: C.PanelRow,
  Card: C.Card, CardBody: C.CardBody, CardHeader: C.CardHeader, CardFooter: C.CardFooter, CardDivider: C.CardDivider,
  TextControl: C.TextControl, TextareaControl: C.TextareaControl, SelectControl: C.SelectControl, CheckboxControl: C.CheckboxControl,
  ToggleControl: C.ToggleControl, RangeControl: C.RangeControl, RadioControl: C.RadioControl, SearchControl: C.SearchControl,
  ColorPalette: C.ColorPalette, ColorIndicator: C.ColorIndicator, ColorPicker: C.ColorPicker, FontSizePicker: C.FontSizePicker,
  ToggleGroupControl: C.__experimentalToggleGroupControl, ToggleGroupControlOption: C.__experimentalToggleGroupControlOption,
  ToggleGroupControlOptionIcon: C.__experimentalToggleGroupControlOptionIcon,
  UnitControl: C.__experimentalUnitControl, BoxControl: C.__experimentalBoxControl, NumberControl: C.__experimentalNumberControl,
  HStack: C.__experimentalHStack, VStack: C.__experimentalVStack, Spacer: C.__experimentalSpacer, Heading: C.__experimentalHeading, Text: C.__experimentalText, Truncate: C.__experimentalTruncate,
  ItemGroup: C.__experimentalItemGroup, Item: C.__experimentalItem, Divider: C.__experimentalDivider,
  ToolsPanel: C.__experimentalToolsPanel, ToolsPanelItem: C.__experimentalToolsPanelItem,
  TabPanel: C.TabPanel, Notice: C.Notice, Spinner: C.Spinner, Tooltip: C.Tooltip, Modal: C.Modal, Snackbar: C.Snackbar,
  BaseControl: C.BaseControl, FlexBlock: C.FlexBlock, Flex: C.Flex, FlexItem: C.FlexItem, Dropdown: C.Dropdown, DropdownMenu: C.DropdownMenu,
  ExternalLink: C.ExternalLink, VisuallyHidden: C.VisuallyHidden, Placeholder: C.Placeholder, FormToggle: C.FormToggle,
  BorderControl: C.BorderControl, SlotFillProvider: C.SlotFillProvider, Popover: C.Popover, ProgressBar: C.ProgressBar, Badge: C.Badge
};
