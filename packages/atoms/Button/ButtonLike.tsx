import { ElementType, ReactElement, forwardRef } from 'react';
import { Box, PolymorphicComponentProps } from 'react-polymorphic-box';

import { ThemeColorUnion } from '@proton/colors';
import clsx from '@proton/utils/clsx';

import { CircleLoader } from '../CircleLoader';

import './ButtonLike.scss';

export type ButtonLikeShape = 'solid' | 'outline' | 'ghost' | 'underline';

export type ButtonLikeSize = 'small' | 'medium' | 'large';

interface ButtonLikeOwnProps {
    /**
     * Whether the button should render a loader.
     * Button is disabled when this prop is true.
     */
    loading?: boolean;
    /**
     * Controls the shape of the button.
     * - `solid` for filled button
     * - `outline` for bordered button
     * - `ghost` for minimalistic button with hover/focus changing
     * - `underline` for underlined text button, with paddings for alignment
     */
    shape?: ButtonLikeShape;
    /**
     * Controls the colors of the button.
     * Exact styles applied depend on the chosen shape as well.
     */
    color?: ThemeColorUnion;
    /**
     * Controls how large the button should be.
     */
    size?: ButtonLikeSize;
    /**
     * Puts the button in a disabled state.
     */
    disabled?: boolean;
    /**
     * If true, the button will take up the full width of its container.
     */
    fullWidth?: boolean;
    /**
     * If true, display as pill.
     */
    pill?: boolean;
    /**
     * If true, display as icon.
     */
    icon?: boolean;
    /**
     * If true, this button is part of a button group.
     */
    group?: boolean;
    /**
     * For a selected item inside a group.
     */
    selected?: boolean;
}

export type ButtonLikeProps<E extends ElementType> = PolymorphicComponentProps<E, ButtonLikeOwnProps>;

const defaultElement = 'button';

const ButtonLikeBase = <E extends ElementType = typeof defaultElement>(
    {
        loading = false,
        disabled = false,
        className,
        tabIndex,
        children,
        shape: shapeProp,
        color = 'weak',
        size = 'medium',
        fullWidth,
        pill,
        icon,
        group,
        selected = false,
        ...restProps
    }: ButtonLikeProps<E>,
    ref: typeof restProps.ref
) => {
    const isDisabled = loading || disabled;

    const shape = shapeProp || (color === 'weak' ? 'outline' : 'solid');

    const isUnderlineShape = shape === 'underline';

    const buttonClassName = clsx(
        isUnderlineShape ? 'button-underline' : 'button',
        !isUnderlineShape && pill && 'button-pill',
        !isUnderlineShape && icon && 'button-for-icon',
        !isUnderlineShape && fullWidth && 'w100',
        group && 'button-group-item',
        group && selected && 'is-selected',
        size !== 'medium' && `button-${size}`,
        `button-${shape}-${color}`,
        restProps.as !== 'button' ? 'inline-block text-center' : '',
        className
    );

    const roleProps = restProps.onClick && !restProps.type ? { role: 'button' } : undefined;

    return (
        <Box
            as={defaultElement}
            ref={ref}
            className={buttonClassName}
            disabled={isDisabled}
            tabIndex={isDisabled ? -1 : tabIndex}
            aria-busy={loading}
            {...roleProps}
            {...restProps}
        >
            {children}
            {loading && (
                <span className="button-loader-container">
                    <CircleLoader />
                </span>
            )}
        </Box>
    );
};

const ButtonLike: <E extends ElementType = typeof defaultElement>(props: ButtonLikeProps<E>) => ReactElement | null =
    forwardRef(ButtonLikeBase);

export default ButtonLike;
