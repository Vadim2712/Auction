// src/components/common/Input.js
import React from 'react';
import './Input.css';

const Input = ({
    id,
    label,
    name,
    type = 'text',
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    error,
    className = '',
    min,
    step,
    rows
}) => {
    const inputClasses = `form-control ${error ? 'is-invalid' : ''} ${className}`;
    const commonProps = {
        id: id || name,
        name: name,
        value: value,
        onChange: onChange,
        placeholder: placeholder,
        required: required,
        disabled: disabled,
        className: inputClasses.trim(),
    };

    return (
        <div className="form-group-common">
            {label && <label htmlFor={id || name} className="form-label">{label}{required && '*'}</label>}
            {type === 'textarea' ? (
                <textarea
                    {...commonProps}
                    rows={rows || 3}
                />
            ) : (
                <input
                    type={type}
                    {...commonProps}
                    min={min}
                    step={step}
                />
            )}
            {error && <div className="invalid-feedback">{error}</div>}
        </div>
    );
};

export default Input;